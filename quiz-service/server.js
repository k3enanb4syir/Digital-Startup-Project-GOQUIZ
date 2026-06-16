const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { createClient } = require("redis");
const pool = require("./db");

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT || 6379),
  },
});

redisClient.on("error", (error) => {
  console.error("Redis error:", error.message);
});

async function connectRedisWithRetry() {
  while (!redisClient.isOpen) {
    try {
      await redisClient.connect();
      console.log("Quiz Service connected to Redis");
    } catch (error) {
      console.log("Redis is not ready. Retrying in 5 seconds...");

      await new Promise((resolve) => {
        setTimeout(resolve, 5000);
      });
    }
  }
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication token is required",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      message: "Invalid or expired token",
    });
  }
}

function teacherOnly(req, res, next) {
  if (req.user.role !== "teacher") {
    return res.status(403).json({
      message: "Only trainers can access this feature",
    });
  }

  next();
}

/*
|--------------------------------------------------------------------------
| Health check
|--------------------------------------------------------------------------
*/

app.get("/health", (req, res) => {
  res.json({
    service: "quiz-service",
    status: "running",
  });
});

/*
|--------------------------------------------------------------------------
| Create a training assessment
|--------------------------------------------------------------------------
*/

app.post("/create", authenticate, teacherOnly, async (req, res) => {
  const client = await pool.connect();

  try {
    const { title, description, questions } = req.body;

    if (
      !title ||
      typeof title !== "string" ||
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      return res.status(400).json({
        message:
          "Assessment title and at least one question are required",
      });
    }

    for (const question of questions) {
      if (
        !question.question_text ||
        !question.correct_answer ||
        !Array.isArray(question.options) ||
        question.options.length < 2
      ) {
        return res.status(400).json({
          message:
            "Every question needs text, at least two options, and a correct answer",
        });
      }

      if (!question.options.includes(question.correct_answer)) {
        return res.status(400).json({
          message:
            "The correct answer must match one of the answer options",
        });
      }
    }

    const quizCode = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    await client.query("BEGIN");

    const quizResult = await client.query(
      `
      INSERT INTO quizzes (
        title,
        description,
        teacher_id,
        quiz_code
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        title.trim(),
        description?.trim() || "",
        req.user.id,
        quizCode,
      ]
    );

    const quiz = quizResult.rows[0];

    for (const question of questions) {
      const questionResult = await client.query(
        `
        INSERT INTO questions (
          quiz_id,
          question_text,
          correct_answer
        )
        VALUES ($1, $2, $3)
        RETURNING *
        `,
        [
          quiz.id,
          question.question_text.trim(),
          question.correct_answer.trim(),
        ]
      );

      const savedQuestion = questionResult.rows[0];

      for (const option of question.options) {
        await client.query(
          `
          INSERT INTO answer_options (
            question_id,
            option_text
          )
          VALUES ($1, $2)
          `,
          [savedQuestion.id, option.trim()]
        );
      }
    }

    await client.query("COMMIT");

    if (redisClient.isOpen) {
      await redisClient.del("all_quizzes");
    }

    return res.status(201).json({
      message: "Training assessment created successfully",
      quiz,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Create assessment error:", error);

    return res.status(500).json({
      message: "Failed to create training assessment",
    });
  } finally {
    client.release();
  }
});

/*
|--------------------------------------------------------------------------
| List all training assessments
|--------------------------------------------------------------------------
*/

app.get("/all", authenticate, async (req, res) => {
  try {
    if (redisClient.isOpen) {
      const cached = await redisClient.get("all_quizzes");

      if (cached) {
        return res.json({
          source: "redis-cache",
          quizzes: JSON.parse(cached),
        });
      }
    }

    const result = await pool.query(
      `
      SELECT
        q.id,
        q.title,
        q.description,
        q.quiz_code,
        q.created_at,
        u.name AS teacher_name
      FROM quizzes q
      JOIN users u
        ON q.teacher_id = u.id
      ORDER BY q.created_at DESC
      `
    );

    if (redisClient.isOpen) {
      await redisClient.setEx(
        "all_quizzes",
        60,
        JSON.stringify(result.rows)
      );
    }

    return res.json({
      source: "postgresql",
      quizzes: result.rows,
    });
  } catch (error) {
    console.error("Load assessments error:", error);

    return res.status(500).json({
      message: "Failed to load training assessments",
    });
  }
});

/*
|--------------------------------------------------------------------------
| Student result history
|--------------------------------------------------------------------------
*/

app.get("/results/me", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        s.id,
        q.title,
        q.quiz_code,
        sc.score,
        sc.total,
        s.status,
        s.created_at
      FROM submissions s
      JOIN quizzes q
        ON s.quiz_id = q.id
      LEFT JOIN scores sc
        ON sc.submission_id = s.id
      WHERE s.student_id = $1
      ORDER BY s.created_at DESC
      `,
      [req.user.id]
    );

    return res.json({
      results: result.rows,
    });
  } catch (error) {
    console.error("Load student results error:", error);

    return res.status(500).json({
      message: "Failed to load training results",
    });
  }
});

/*
|--------------------------------------------------------------------------
| Trainer analytics
|--------------------------------------------------------------------------
*/

app.get(
  "/trainer/analytics",
  authenticate,
  teacherOnly,
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          q.id,
          q.title,
          q.quiz_code,

          COUNT(s.id)::INTEGER
            AS total_attempts,

          COUNT(s.id) FILTER (
            WHERE s.status = 'COMPLETED'
          )::INTEGER
            AS completed_attempts,

          COUNT(s.id) FILTER (
            WHERE s.status = 'PENDING'
          )::INTEGER
            AS pending_attempts,

          COUNT(s.id) FILTER (
            WHERE s.status = 'FAILED'
          )::INTEGER
            AS failed_attempts,

          COALESCE(
            ROUND(
              AVG(
                CASE
                  WHEN sc.total > 0
                  THEN (
                    sc.score::NUMERIC /
                    sc.total
                  ) * 100
                  ELSE NULL
                END
              ),
              1
            ),
            0
          ) AS average_percentage

        FROM quizzes q

        LEFT JOIN submissions s
          ON s.quiz_id = q.id

        LEFT JOIN scores sc
          ON sc.submission_id = s.id

        WHERE q.teacher_id = $1

        GROUP BY
          q.id,
          q.title,
          q.quiz_code,
          q.created_at

        ORDER BY q.created_at DESC
        `,
        [req.user.id]
      );

      return res.json({
        analytics: result.rows,
      });
    } catch (error) {
      console.error("Trainer analytics error:", error);

      return res.status(500).json({
        message: "Failed to load trainer analytics",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Get one assessment using its training code
|--------------------------------------------------------------------------
| This dynamic route must remain after the fixed routes above.
*/

app.get("/:code", authenticate, async (req, res) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const cacheKey = `quiz:${code}`;

    if (redisClient.isOpen) {
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        return res.json({
          source: "redis-cache",
          quiz: JSON.parse(cached),
        });
      }
    }

    const quizResult = await pool.query(
      `
      SELECT
        id,
        title,
        description,
        teacher_id,
        quiz_code,
        created_at
      FROM quizzes
      WHERE quiz_code = $1
      `,
      [code]
    );

    if (quizResult.rows.length === 0) {
      return res.status(404).json({
        message: "Training assessment not found",
      });
    }

    const quiz = quizResult.rows[0];

    const questionsResult = await pool.query(
      `
      SELECT
        id,
        question_text
      FROM questions
      WHERE quiz_id = $1
      ORDER BY id
      `,
      [quiz.id]
    );

    const questions = [];

    for (const question of questionsResult.rows) {
      const optionsResult = await pool.query(
        `
        SELECT
          id,
          option_text
        FROM answer_options
        WHERE question_id = $1
        ORDER BY id
        `,
        [question.id]
      );

      questions.push({
        ...question,
        options: optionsResult.rows,
      });
    }

    const fullQuiz = {
      ...quiz,
      questions,
    };

    if (redisClient.isOpen) {
      await redisClient.setEx(
        cacheKey,
        1800,
        JSON.stringify(fullQuiz)
      );
    }

    return res.json({
      source: "postgresql",
      quiz: fullQuiz,
    });
  } catch (error) {
    console.error("Load assessment error:", error);

    return res.status(500).json({
      message: "Failed to load training assessment",
    });
  }
});

async function startServer() {
  await connectRedisWithRetry();

  app.listen(PORT, () => {
    console.log(`Quiz service running on port ${PORT}`);
  });
}

startServer();