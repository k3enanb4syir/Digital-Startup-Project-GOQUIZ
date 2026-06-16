const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const { connectRabbitMQ, publishScoringJob } = require("./rabbitmq");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3003;

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Missing token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ message: "Invalid token" });
  }
}

function studentOnly(req, res, next) {
  if (req.user.role !== "student") {
    return res.status(403).json({ message: "Only students can submit answers" });
  }

  next();
}

app.get("/health", (req, res) => {
  res.json({ service: "submission-service", status: "running" });
});

app.post("/answers", authenticate, studentOnly, async (req, res) => {
  const client = await pool.connect();

  try {
    const { quiz_code, answers } = req.body;

    if (!quiz_code || !answers || answers.length === 0) {
      return res.status(400).json({ message: "Quiz code and answers are required" });
    }

    const quizResult = await client.query(
      "SELECT * FROM quizzes WHERE quiz_code = $1",
      [quiz_code]
    );

    if (quizResult.rows.length === 0) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const quiz = quizResult.rows[0];

    await client.query("BEGIN");

    const submissionResult = await client.query(
      "INSERT INTO submissions (quiz_id, student_id, status) VALUES ($1, $2, $3) RETURNING *",
      [quiz.id, req.user.id, "PENDING"]
    );

    const submission = submissionResult.rows[0];

    for (const answer of answers) {
      await client.query(
        "INSERT INTO submission_answers (submission_id, question_id, answer_text) VALUES ($1, $2, $3)",
        [submission.id, answer.question_id, answer.answer_text]
      );
    }

    await client.query("COMMIT");

    publishScoringJob({
      submission_id: submission.id,
      quiz_id: quiz.id,
      student_id: req.user.id,
    });

    res.status(202).json({
      message: "Submission accepted. Your score is being processed.",
      submission_id: submission.id,
      status: "PENDING",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});

connectRabbitMQ().then(() => {
  app.listen(PORT, () => {
    console.log(`Submission service running on port ${PORT}`);
  });
});