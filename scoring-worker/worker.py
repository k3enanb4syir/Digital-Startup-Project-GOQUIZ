import os
import json
import time
import pika
import psycopg2


def get_db_connection():
    return psycopg2.connect(
        host=os.environ["DB_HOST"],
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        dbname=os.environ["DB_NAME"],
        port=os.environ["DB_PORT"],
    )


def score_submission(submission_id, quiz_id, student_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT q.id, q.correct_answer, sa.answer_text
            FROM questions q
            JOIN submission_answers sa ON sa.question_id = q.id
            WHERE sa.submission_id = %s AND q.quiz_id = %s
            """,
            (submission_id, quiz_id),
        )

        rows = cursor.fetchall()

        total = len(rows)
        score = 0

        for question_id, correct_answer, answer_text in rows:
            if correct_answer.strip().lower() == answer_text.strip().lower():
                score += 1

        cursor.execute(
            """
            INSERT INTO scores (submission_id, student_id, quiz_id, score, total)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (submission_id, student_id, quiz_id, score, total),
        )

        cursor.execute(
            """
            UPDATE submissions
            SET status = 'COMPLETED'
            WHERE id = %s
            """,
            (submission_id,),
        )

        conn.commit()

        print(f"Scored submission {submission_id}: {score}/{total}")

    except Exception as e:
        conn.rollback()
        print("Error while scoring:", e)

        cursor.execute(
            """
            UPDATE submissions
            SET status = 'FAILED'
            WHERE id = %s
            """,
            (submission_id,),
        )
        conn.commit()

    finally:
        cursor.close()
        conn.close()


def connect_rabbitmq():
    rabbitmq_url = os.environ["RABBITMQ_URL"]

    while True:
        try:
            params = pika.URLParameters(rabbitmq_url)
            connection = pika.BlockingConnection(params)
            channel = connection.channel()
            channel.queue_declare(queue="scoring_queue", durable=True)
            print("Scoring Worker connected to RabbitMQ")
            return connection, channel
        except Exception:
            print("RabbitMQ not ready, retrying in 5 seconds...")
            time.sleep(5)


def callback(ch, method, properties, body):
    job = json.loads(body)

    print("Received scoring job:", job)

    score_submission(
        job["submission_id"],
        job["quiz_id"],
        job["student_id"]
    )

    ch.basic_ack(delivery_tag=method.delivery_tag)


connection, channel = connect_rabbitmq()

channel.basic_qos(prefetch_count=1)
channel.basic_consume(queue="scoring_queue", on_message_callback=callback)

print("Scoring Worker is waiting for jobs...")
channel.start_consuming()