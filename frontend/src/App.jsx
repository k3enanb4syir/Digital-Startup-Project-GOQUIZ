import React, { useState } from "react";
import axios from "axios";

const API = "";

const emptyRegisterData = {
  name: "",
  email: "",
  password: "",
  role: "student",
};

const emptyLoginData = {
  email: "",
  password: "",
};

const emptyQuizForm = {
  title: "",
  description: "",
  questions: [
    {
      question_text: "",
      correct_answer: "",
      options: ["", "", "", ""],
    },
  ],
};

const trainingTemplates = [
  {
    id: "safety",
    icon: "🦺",
    category: "Safety",
    title: "Safety Training",
    description:
      "A ready-made assessment for basic workplace and operational safety.",
    quiz: {
      title: "Safety Training",
      description:
        "Evaluate trainee knowledge of essential safety procedures.",
      questions: [
        {
          question_text:
            "What should you do first after identifying a safety hazard?",
          options: [
            "Ignore it",
            "Report it to the trainer or supervisor",
            "Continue working normally",
            "Wait until the next day",
          ],
          correct_answer:
            "Report it to the trainer or supervisor",
        },
        {
          question_text:
            "Which item is considered personal protective equipment?",
          options: [
            "Safety helmet",
            "Notebook",
            "Mobile phone",
            "Water bottle",
          ],
          correct_answer: "Safety helmet",
        },
      ],
    },
  },
  {
    id: "security",
    icon: "🔐",
    category: "Compliance",
    title: "Digital Security",
    description:
      "A ready-made assessment about passwords, OTPs, and account protection.",
    quiz: {
      title: "Digital Security Awareness",
      description:
        "Evaluate trainee understanding of digital account protection.",
      questions: [
        {
          question_text:
            "What should you do if someone asks for your OTP?",
          options: [
            "Share it immediately",
            "Never share the OTP",
            "Post it online",
            "Send it to a group chat",
          ],
          correct_answer: "Never share the OTP",
        },
        {
          question_text:
            "Which password is generally the strongest?",
          options: [
            "123456",
            "password",
            "myname",
            "A long unique password with mixed characters",
          ],
          correct_answer:
            "A long unique password with mixed characters",
        },
      ],
    },
  },
];

function getSavedUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function cloneEmptyQuizForm() {
  return {
    title: "",
    description: "",
    questions: [
      {
        question_text: "",
        correct_answer: "",
        options: ["", "", "", ""],
      },
    ],
  };
}

function App() {
  const [mode, setMode] = useState("login");

  const [token, setToken] = useState(
    localStorage.getItem("token") || ""
  );

  const [user, setUser] = useState(getSavedUser());

  const [activeSection, setActiveSection] =
    useState("dashboard");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState("info");

  const [registerData, setRegisterData] =
    useState(emptyRegisterData);

  const [loginData, setLoginData] =
    useState(emptyLoginData);

  const [quizForm, setQuizForm] =
    useState(cloneEmptyQuizForm());

  const [quizzes, setQuizzes] = useState([]);
  const [quizCode, setQuizCode] = useState("");
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [results, setResults] = useState([]);

  const [trainerAnalytics, setTrainerAnalytics] =
    useState([]);

  const [analyticsLoading, setAnalyticsLoading] =
    useState(false);

  const isTrainer = user?.role === "teacher";

  const roleLabel = isTrainer
    ? "Trainer / Admin"
    : "Partner / Trainee";

  const authHeader = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const answeredCount = answers.filter(
    (answer) => answer.answer_text
  ).length;

  function showMessage(text, type = "info") {
    setMessage(text);
    setMessageType(type);
  }

  function clearMessage() {
    setMessage("");
  }

  async function register() {
    try {
      if (
        !registerData.name.trim() ||
        !registerData.email.trim() ||
        !registerData.password
      ) {
        showMessage(
          "Please complete all registration fields.",
          "error"
        );
        return;
      }

      const response = await axios.post(
        `${API}/auth/register`,
        registerData
      );

      showMessage(
        response.data.message ||
          "Account created successfully.",
        "success"
      );

      setRegisterData({
        ...emptyRegisterData,
      });

      setLoginData({
        ...emptyLoginData,
      });

      setMode("login");
    } catch (error) {
      showMessage(
        error.response?.data?.message ||
          "Registration failed.",
        "error"
      );
    }
  }

  async function login() {
    try {
      if (
        !loginData.email.trim() ||
        !loginData.password
      ) {
        showMessage(
          "Please enter your email and password.",
          "error"
        );
        return;
      }

      const response = await axios.post(
        `${API}/auth/login`,
        loginData
      );

      localStorage.setItem(
        "token",
        response.data.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(response.data.user)
      );

      setToken(response.data.token);
      setUser(response.data.user);

      setLoginData({
        ...emptyLoginData,
      });

      setRegisterData({
        ...emptyRegisterData,
      });

      setActiveSection("dashboard");

      showMessage(
        "Welcome to GoQuiz. Login successful.",
        "success"
      );
    } catch (error) {
      showMessage(
        error.response?.data?.message ||
          "Login failed.",
        "error"
      );
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setToken("");
    setUser(null);

    setActiveSection("dashboard");
    setActiveQuiz(null);

    setQuizzes([]);
    setResults([]);
    setTrainerAnalytics([]);
    setAnswers([]);

    setQuizCode("");

    setLoginData({
      ...emptyLoginData,
    });

    setRegisterData({
      ...emptyRegisterData,
    });

    setQuizForm(cloneEmptyQuizForm());

    showMessage("You have logged out.", "info");
  }

  async function createQuiz() {
    try {
      const cleanedQuestions =
        quizForm.questions.map((question) => ({
          question_text:
            question.question_text.trim(),

          correct_answer:
            question.correct_answer.trim(),

          options: question.options
            .map((option) => option.trim())
            .filter(Boolean),
        }));

      const incompleteQuestion =
        cleanedQuestions.some(
          (question) =>
            !question.question_text ||
            !question.correct_answer ||
            question.options.length < 2 ||
            !question.options.includes(
              question.correct_answer
            )
        );

      if (
        !quizForm.title.trim() ||
        cleanedQuestions.length === 0 ||
        incompleteQuestion
      ) {
        showMessage(
          "Complete the title, questions, options, and correct answers before publishing.",
          "error"
        );
        return;
      }

      const payload = {
        title: quizForm.title.trim(),
        description:
          quizForm.description.trim(),
        questions: cleanedQuestions,
      };

      const response = await axios.post(
        `${API}/quiz/create`,
        payload,
        authHeader
      );

      setQuizForm(cloneEmptyQuizForm());
      setActiveQuiz(null);
      setAnswers([]);
      setQuizCode("");

      await fetchQuizzes(false);

      showMessage(
        `Assessment published. Training Code: ${response.data.quiz.quiz_code}`,
        "success"
      );
    } catch (error) {
      showMessage(
        error.response?.data?.message ||
          "Failed to publish assessment.",
        "error"
      );
    }
  }

  async function fetchQuizzes(
    showSuccessMessage = true
  ) {
    try {
      const response = await axios.get(
        `${API}/quiz/all`,
        authHeader
      );

      setQuizzes(
        response.data.quizzes || []
      );

      if (showSuccessMessage) {
        showMessage(
          `Training modules loaded from ${
            response.data.source || "server"
          }.`,
          "success"
        );
      }
    } catch (error) {
      showMessage(
        error.response?.data?.message ||
          "Failed to load training modules.",
        "error"
      );
    }
  }

  async function joinQuiz() {
    try {
      if (!quizCode.trim()) {
        showMessage(
          "Enter a training code first.",
          "error"
        );
        return;
      }

      const response = await axios.get(
        `${API}/quiz/${quizCode
          .trim()
          .toUpperCase()}`,
        authHeader
      );

      setActiveQuiz(response.data.quiz);

      setAnswers(
        response.data.quiz.questions.map(
          (question) => ({
            question_id: question.id,
            answer_text: "",
          })
        )
      );

      showMessage(
        `Assessment loaded from ${
          response.data.source || "server"
        }.`,
        "success"
      );
    } catch (error) {
      showMessage(
        error.response?.data?.message ||
          "Failed to join assessment.",
        "error"
      );
    }
  }

  async function submitAnswers() {
    try {
      const unanswered = answers.some(
        (answer) => !answer.answer_text
      );

      if (unanswered) {
        showMessage(
          "Answer every question before submitting.",
          "error"
        );
        return;
      }

      const response = await axios.post(
        `${API}/submit/answers`,
        {
          quiz_code: activeQuiz.quiz_code,
          answers,
        },
        authHeader
      );

      setActiveQuiz(null);
      setQuizCode("");
      setAnswers([]);
      setActiveSection("results");

      showMessage(
        response.data.message ||
          "Assessment submitted. Your result is being processed.",
        "success"
      );
    } catch (error) {
      showMessage(
        error.response?.data?.message ||
          "Failed to submit assessment.",
        "error"
      );
    }
  }

  async function loadResults() {
    try {
      const response = await axios.get(
        `${API}/quiz/results/me`,
        authHeader
      );

      setResults(
        response.data.results || []
      );

      showMessage(
        "Training results loaded.",
        "success"
      );
    } catch (error) {
      showMessage(
        error.response?.data?.message ||
          "Failed to load results.",
        "error"
      );
    }
  }

  async function loadTrainerAnalytics() {
    try {
      setAnalyticsLoading(true);

      const response = await axios.get(
        `${API}/quiz/trainer/analytics`,
        authHeader
      );

      setTrainerAnalytics(
        response.data.analytics || []
      );

      showMessage(
        "Trainer analytics loaded.",
        "success"
      );
    } catch (error) {
      showMessage(
        error.response?.data?.message ||
          "Failed to load trainer analytics.",
        "error"
      );
    } finally {
      setAnalyticsLoading(false);
    }
  }

  function applyTrainingTemplate(template) {
    setQuizForm(
      JSON.parse(
        JSON.stringify(template.quiz)
      )
    );

    showMessage(
      `${template.title} template loaded. You can edit it before publishing.`,
      "success"
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function updateQuestion(
    questionIndex,
    field,
    value
  ) {
    setQuizForm((previous) => ({
      ...previous,

      questions:
        previous.questions.map(
          (question, index) =>
            index === questionIndex
              ? {
                  ...question,
                  [field]: value,
                }
              : question
        ),
    }));
  }

  function updateOption(
    questionIndex,
    optionIndex,
    value
  ) {
    setQuizForm((previous) => ({
      ...previous,

      questions:
        previous.questions.map(
          (question, index) =>
            index === questionIndex
              ? {
                  ...question,

                  options:
                    question.options.map(
                      (
                        option,
                        currentOptionIndex
                      ) =>
                        currentOptionIndex ===
                        optionIndex
                          ? value
                          : option
                    ),
                }
              : question
        ),
    }));
  }

  function addQuestion() {
    setQuizForm((previous) => ({
      ...previous,

      questions: [
        ...previous.questions,
        {
          question_text: "",
          correct_answer: "",
          options: ["", "", "", ""],
        },
      ],
    }));
  }

  function removeQuestion(index) {
    if (quizForm.questions.length === 1) {
      showMessage(
        "At least one question is required.",
        "error"
      );
      return;
    }

    setQuizForm((previous) => ({
      ...previous,

      questions:
        previous.questions.filter(
          (_, questionIndex) =>
            questionIndex !== index
        ),
    }));
  }

  function updateAnswer(
    questionIndex,
    value
  ) {
    setAnswers((previous) =>
      previous.map((answer, index) =>
        index === questionIndex
          ? {
              ...answer,
              answer_text: value,
            }
          : answer
      )
    );
  }

  function goToDashboard() {
    clearMessage();
    setActiveSection("dashboard");
  }

  async function goToTrainingModules() {
    clearMessage();
    setActiveSection("training");

    if (quizzes.length === 0) {
      await fetchQuizzes(false);
    }
  }

  async function goToResults() {
    clearMessage();
    setActiveSection("results");

    if (isTrainer) {
      await loadTrainerAnalytics();
    } else {
      await loadResults();
    }
  }

  if (!token || !user) {
    return (
      <div className="auth-page">
        <div className="auth-background">
          <div className="floating-card card-one">
            Safety
          </div>

          <div className="floating-card card-two">
            GoFood
          </div>

          <div className="floating-card card-three">
            GoRide
          </div>
        </div>

        <div className="auth-layout">
          <section className="brand-panel">
            <div className="brand-badge">
              <span className="brand-dot"></span>
              Gojek-inspired Training Platform
            </div>

            <div className="logo-row">
              <div className="logo-mark">
                GQ
              </div>

              <div>
                <h1>GoQuiz</h1>

                <p>
                  Gojek Partner Training &
                  Assessment Platform
                </p>
              </div>
            </div>

            <h2>
              Train partners faster. Assess
              performance smarter.
            </h2>

            <p className="brand-description">
              A scalable training platform for
              driver partners, merchants, and
              internal teams. Built with
              asynchronous scoring, Redis caching,
              RabbitMQ messaging, and Dockerized
              services.
            </p>

            <div className="hero-stats">
              <div>
                <strong>100+</strong>
                <span>Peak trainees</span>
              </div>

              <div>
                <strong>Async</strong>
                <span>Scoring flow</span>
              </div>

              <div>
                <strong>Docker</strong>
                <span>Deployment</span>
              </div>
            </div>

            <div className="feature-list">
              <div>
                ✅ Partner onboarding assessments
              </div>

              <div>
                ✅ Driver safety training quizzes
              </div>

              <div>
                ✅ GoFood merchant knowledge checks
              </div>

              <div>
                ✅ Background scoring with RabbitMQ
              </div>
            </div>
          </section>

          <section className="auth-card">
            <div className="auth-card-header">
              <h2>
                {mode === "login"
                  ? "Welcome back"
                  : "Create your account"}
              </h2>

              <p>
                {mode === "login"
                  ? "Login to continue your GoQuiz training dashboard."
                  : "Register as a trainer or partner to begin."}
              </p>
            </div>

            <div className="tabs">
              <button
                className={
                  mode === "login"
                    ? "active"
                    : ""
                }
                onClick={() => {
                  setMode("login");
                  clearMessage();
                }}
              >
                Login
              </button>

              <button
                className={
                  mode === "register"
                    ? "active"
                    : ""
                }
                onClick={() => {
                  setMode("register");
                  clearMessage();
                }}
              >
                Register
              </button>
            </div>

            {mode === "login" ? (
              <div className="form-section">
                <label>Email Address</label>

                <input
                  autoComplete="off"
                  placeholder="example@email.com"
                  value={loginData.email}
                  onChange={(event) =>
                    setLoginData({
                      ...loginData,
                      email: event.target.value,
                    })
                  }
                />

                <label>Password</label>

                <input
                  autoComplete="new-password"
                  placeholder="Enter your password"
                  type="password"
                  value={loginData.password}
                  onChange={(event) =>
                    setLoginData({
                      ...loginData,
                      password:
                        event.target.value,
                    })
                  }
                />

                <button
                  className="primary full-width"
                  onClick={login}
                >
                  Login to GoQuiz
                </button>
              </div>
            ) : (
              <div className="form-section">
                <label>Full Name</label>

                <input
                  autoComplete="off"
                  placeholder="Your name"
                  value={registerData.name}
                  onChange={(event) =>
                    setRegisterData({
                      ...registerData,
                      name: event.target.value,
                    })
                  }
                />

                <label>Email Address</label>

                <input
                  autoComplete="off"
                  placeholder="example@email.com"
                  value={registerData.email}
                  onChange={(event) =>
                    setRegisterData({
                      ...registerData,
                      email: event.target.value,
                    })
                  }
                />

                <label>Password</label>

                <input
                  autoComplete="new-password"
                  placeholder="Create password"
                  type="password"
                  value={registerData.password}
                  onChange={(event) =>
                    setRegisterData({
                      ...registerData,
                      password:
                        event.target.value,
                    })
                  }
                />

                <label>Account Type</label>

                <select
                  value={registerData.role}
                  onChange={(event) =>
                    setRegisterData({
                      ...registerData,
                      role: event.target.value,
                    })
                  }
                >
                  <option value="student">
                    Partner / Trainee
                  </option>

                  <option value="teacher">
                    Trainer / Admin
                  </option>
                </select>

                <button
                  className="primary full-width"
                  onClick={register}
                >
                  Create GoQuiz Account
                </button>
              </div>
            )}

            {message && (
              <div
                className={`notice ${messageType}`}
              >
                {message}
              </div>
            )}

            <p className="disclaimer">
              Demo prototype for academic
              purposes. Not an official Gojek
              product.
            </p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark small">
            GQ
          </div>

          <div>
            <h2>GoQuiz</h2>
            <p>Partner Training</p>
          </div>
        </div>

        <div className="side-menu">
          <button
            className={
              activeSection === "dashboard"
                ? "active"
                : ""
            }
            onClick={goToDashboard}
          >
            Dashboard
          </button>

          <button
            className={
              activeSection === "training"
                ? "active"
                : ""
            }
            onClick={goToTrainingModules}
          >
            Training Modules
          </button>

          <button
            className={
              activeSection === "results"
                ? "active"
                : ""
            }
            onClick={goToResults}
          >
            Assessment Results
          </button>
        </div>

        <div className="system-card">
          <span>System Status</span>

          <strong>
            All Services Online
          </strong>

          <p>
            Frontend • Gateway • PostgreSQL •
            Redis • RabbitMQ
          </p>
        </div>
      </aside>

      <main className="main-content">
        <nav className="topbar">
          <div>
            <span className="page-label">
              {activeSection === "dashboard" &&
                "GoQuiz Dashboard"}

              {activeSection === "training" &&
                "Training Modules"}

              {activeSection === "results" &&
                "Assessment Results"}
            </span>

            <h1>
              {activeSection === "dashboard" &&
                "Gojek Partner Training & Assessment"}

              {activeSection === "training" &&
                "Training Module Center"}

              {activeSection === "results" &&
                "Training Performance Results"}
            </h1>
          </div>

          <div className="user-profile">
            <div>
              <strong>{user.name}</strong>
              <span>{roleLabel}</span>
            </div>

            <button
              className="ghost"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </nav>

        {message && (
          <div
            className={`notice dashboard-notice ${messageType}`}
          >
            {message}
          </div>
        )}

        {activeSection === "dashboard" && (
          <>
            <section className="dashboard-hero">
              <div>
                <div className="brand-badge light">
                  <span className="brand-dot"></span>
                  Scalable training workflow
                </div>

                <h2>
                  {isTrainer
                    ? "Create partner assessments and improve training readiness."
                    : "Complete your training modules and track your assessment results."}
                </h2>

                <p>
                  GoQuiz is a Gojek-themed
                  training platform where
                  trainers create assessments and
                  partners complete them online.
                  Submissions are accepted quickly
                  and scored asynchronously in the
                  background.
                </p>

                <div className="hero-actions">
                  <button
                    className="primary"
                    onClick={goToTrainingModules}
                  >
                    Go to Training Modules
                  </button>

                  <button
                    className="secondary"
                    onClick={goToResults}
                  >
                    {isTrainer
                      ? "View Trainer Analytics"
                      : "View My Results"}
                  </button>
                </div>
              </div>

              <div className="workflow-card">
                <h3>Submission Flow</h3>

                <div className="workflow-step">
                  Partner submits assessment
                </div>

                <div className="workflow-line"></div>

                <div className="workflow-step">
                  RabbitMQ queues scoring job
                </div>

                <div className="workflow-line"></div>

                <div className="workflow-step">
                  Worker calculates score
                </div>
              </div>
            </section>

            <section className="content-grid">
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <span className="section-kicker">
                      Quick Access
                    </span>

                    <h2>Training Modules</h2>
                  </div>
                </div>

                <p className="panel-text">
                  Open the Training Modules
                  section to create assessments,
                  load a reusable template, or
                  join an available module.
                </p>

                <button
                  className="primary"
                  onClick={goToTrainingModules}
                >
                  Open Training Modules
                </button>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <span className="section-kicker">
                      Performance
                    </span>

                    <h2>
                      Assessment Results
                    </h2>
                  </div>
                </div>

                <p className="panel-text">
                  View trainee performance,
                  completed assessments, pending
                  scoring jobs, and average
                  results.
                </p>

                <button
                  className="secondary"
                  onClick={goToResults}
                >
                  Open Assessment Results
                </button>
              </div>
            </section>
          </>
        )}

        {activeSection === "training" && (
          <section className="content-grid">
            {isTrainer && (
              <div className="panel large-panel">
                <div className="panel-header">
                  <div>
                    <span className="section-kicker">
                      Content Library
                    </span>

                    <h2>
                      Reusable Training Templates
                    </h2>
                  </div>

                  <span className="pill green">
                    2 Templates
                  </span>
                </div>

                <p className="panel-text">
                  Select a template to fill the
                  assessment form automatically.
                  You can edit every question
                  before publishing.
                </p>

                <div className="template-grid">
                  {trainingTemplates.map(
                    (template) => (
                      <article
                        className="template-card"
                        key={template.id}
                      >
                        <div className="template-icon">
                          {template.icon}
                        </div>

                        <span className="template-category">
                          {template.category}
                        </span>

                        <h3>
                          {template.title}
                        </h3>

                        <p>
                          {template.description}
                        </p>

                        <button
                          className="secondary full-width"
                          onClick={() =>
                            applyTrainingTemplate(
                              template
                            )
                          }
                        >
                          Use Template
                        </button>
                      </article>
                    )
                  )}
                </div>
              </div>
            )}

            {isTrainer && (
              <div className="panel large-panel">
                <div className="panel-header">
                  <div>
                    <span className="section-kicker">
                      Trainer Tools
                    </span>

                    <h2>
                      Create Training Assessment
                    </h2>
                  </div>

                  <span className="pill">
                    Trainer / Admin
                  </span>
                </div>

                <div className="form-section">
                  <label>Training Title</label>

                  <input
                    placeholder="Example: GoRide Safety Training"
                    value={quizForm.title}
                    onChange={(event) =>
                      setQuizForm({
                        ...quizForm,
                        title:
                          event.target.value,
                      })
                    }
                  />

                  <label>Description</label>

                  <textarea
                    placeholder="Describe what this training assessment is about..."
                    value={
                      quizForm.description
                    }
                    onChange={(event) =>
                      setQuizForm({
                        ...quizForm,
                        description:
                          event.target.value,
                      })
                    }
                  />
                </div>

                {quizForm.questions.map(
                  (question, questionIndex) => (
                    <div
                      className="question-builder"
                      key={questionIndex}
                    >
                      <div className="question-title-row">
                        <h3>
                          Question{" "}
                          {questionIndex + 1}
                        </h3>

                        <button
                          className="danger-light"
                          onClick={() =>
                            removeQuestion(
                              questionIndex
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>

                      <label>
                        Question Text
                      </label>

                      <input
                        placeholder="Example: What should a driver do before starting a trip?"
                        value={
                          question.question_text
                        }
                        onChange={(event) =>
                          updateQuestion(
                            questionIndex,
                            "question_text",
                            event.target.value
                          )
                        }
                      />

                      <div className="option-grid">
                        {question.options.map(
                          (
                            option,
                            optionIndex
                          ) => (
                            <div
                              key={
                                optionIndex
                              }
                            >
                              <label>
                                Option{" "}
                                {optionIndex +
                                  1}
                              </label>

                              <input
                                placeholder={`Option ${
                                  optionIndex +
                                  1
                                }`}
                                value={option}
                                onChange={(
                                  event
                                ) =>
                                  updateOption(
                                    questionIndex,
                                    optionIndex,
                                    event
                                      .target
                                      .value
                                  )
                                }
                              />
                            </div>
                          )
                        )}
                      </div>

                      <label>
                        Correct Answer
                      </label>

                      <input
                        placeholder="Must exactly match the correct option text"
                        value={
                          question.correct_answer
                        }
                        onChange={(event) =>
                          updateQuestion(
                            questionIndex,
                            "correct_answer",
                            event.target.value
                          )
                        }
                      />
                    </div>
                  )
                )}

                <div className="button-row">
                  <button
                    className="secondary"
                    onClick={addQuestion}
                  >
                    + Add Question
                  </button>

                  <button
                    className="primary"
                    onClick={createQuiz}
                  >
                    Publish Training Assessment
                  </button>
                </div>
              </div>
            )}

            <div className="panel">
              <div className="panel-header">
                <div>
                  <span className="section-kicker">
                    Available
                  </span>

                  <h2>Training Modules</h2>
                </div>

                <button
                  className="icon-button"
                  onClick={() =>
                    fetchQuizzes(true)
                  }
                  title="Refresh modules"
                >
                  ↻
                </button>
              </div>

              {quizzes.length === 0 ? (
                <div className="empty-state">
                  <div>📚</div>

                  <h3>
                    No modules loaded yet
                  </h3>

                  <p>
                    Click refresh to fetch
                    available assessments.
                  </p>
                </div>
              ) : (
                <div className="module-list">
                  {quizzes.map((quiz) => (
                    <div
                      className="module-card"
                      key={quiz.id}
                    >
                      <div className="module-icon">
                        🛵
                      </div>

                      <div>
                        <h3>{quiz.title}</h3>

                        <p>
                          {quiz.description ||
                            "No description provided."}
                        </p>

                        <div className="module-meta">
                          <span>
                            Code:{" "}
                            {quiz.quiz_code}
                          </span>

                          <span>
                            Trainer:{" "}
                            {quiz.teacher_name ||
                              "Trainer"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!isTrainer && (
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <span className="section-kicker">
                      Partner Area
                    </span>

                    <h2>Join Training</h2>
                  </div>

                  <span className="pill green">
                    Partner
                  </span>
                </div>

                <label>Training Code</label>

                <div className="join-row">
                  <input
                    placeholder="Enter training code"
                    value={quizCode}
                    onChange={(event) =>
                      setQuizCode(
                        event.target.value.toUpperCase()
                      )
                    }
                  />

                  <button
                    className="primary"
                    onClick={joinQuiz}
                  >
                    Join
                  </button>
                </div>

                {activeQuiz && (
                  <div className="active-assessment">
                    <div className="assessment-header">
                      <div>
                        <span className="section-kicker">
                          Active Assessment
                        </span>

                        <h2>
                          {activeQuiz.title}
                        </h2>

                        <p>
                          {
                            activeQuiz.description
                          }
                        </p>
                      </div>

                      <div className="progress-badge">
                        {answeredCount}/
                        {answers.length} answered
                      </div>
                    </div>

                    {activeQuiz.questions.map(
                      (
                        question,
                        questionIndex
                      ) => (
                        <div
                          className="question-card"
                          key={question.id}
                        >
                          <h3>
                            {questionIndex + 1}
                            .{" "}
                            {
                              question.question_text
                            }
                          </h3>

                          <div className="answer-options">
                            {question.options.map(
                              (option) => (
                                <label
                                  className="answer-option"
                                  key={
                                    option.id
                                  }
                                >
                                  <input
                                    type="radio"
                                    name={`question-${question.id}`}
                                    value={
                                      option.option_text
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      updateAnswer(
                                        questionIndex,
                                        event
                                          .target
                                          .value
                                      )
                                    }
                                  />

                                  <span>
                                    {
                                      option.option_text
                                    }
                                  </span>
                                </label>
                              )
                            )}
                          </div>
                        </div>
                      )
                    )}

                    <button
                      className="primary full-width"
                      onClick={submitAnswers}
                    >
                      Submit Assessment
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {activeSection === "results" && (
          <section className="content-grid">
            {!isTrainer ? (
              <div className="panel large-panel">
                <div className="panel-header">
                  <div>
                    <span className="section-kicker">
                      Performance
                    </span>

                    <h2>
                      My Training Results
                    </h2>
                  </div>

                  <button
                    className="icon-button"
                    onClick={loadResults}
                    title="Refresh results"
                  >
                    ↻
                  </button>
                </div>

                {results.length === 0 ? (
                  <div className="empty-state">
                    <div>🏆</div>

                    <h3>No results yet</h3>

                    <p>
                      Submit an assessment
                      first, then load your
                      results.
                    </p>
                  </div>
                ) : (
                  <div className="result-list">
                    {results.map((result) => (
                      <div
                        className="result-card"
                        key={result.id}
                      >
                        <div>
                          <h3>
                            {result.title}
                          </h3>

                          <p>
                            Training Code:{" "}
                            {
                              result.quiz_code
                            }
                          </p>

                          <span
                            className={`status ${
                              result.status?.toLowerCase() ||
                              ""
                            }`}
                          >
                            {result.status}
                          </span>
                        </div>

                        <div className="score-circle">
                          {result.score !==
                            null &&
                          result.score !==
                            undefined
                            ? `${result.score}/${result.total}`
                            : "..."}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="panel large-panel">
                <div className="panel-header">
                  <div>
                    <span className="section-kicker">
                      Trainer Intelligence
                    </span>

                    <h2>
                      Assessment Analytics
                    </h2>
                  </div>

                  <button
                    className="icon-button"
                    onClick={
                      loadTrainerAnalytics
                    }
                    title="Refresh analytics"
                  >
                    ↻
                  </button>
                </div>

                {analyticsLoading ? (
                  <div className="empty-state">
                    <div>⏳</div>

                    <h3>
                      Loading analytics
                    </h3>
                  </div>
                ) : trainerAnalytics.length ===
                  0 ? (
                  <div className="empty-state">
                    <div>📊</div>

                    <h3>
                      No assessment results yet
                    </h3>

                    <p>
                      Results appear after
                      trainees submit your
                      assessments.
                    </p>
                  </div>
                ) : (
                  <div className="analytics-grid">
                    {trainerAnalytics.map(
                      (quiz) => (
                        <article
                          className="analytics-card"
                          key={quiz.id}
                        >
                          <div className="analytics-card-header">
                            <div>
                              <span className="section-kicker">
                                Training
                                Assessment
                              </span>

                              <h3>
                                {quiz.title}
                              </h3>
                            </div>

                            <span className="code-badge">
                              {
                                quiz.quiz_code
                              }
                            </span>
                          </div>

                          <div className="analytics-numbers">
                            <div>
                              <strong>
                                {
                                  quiz.total_attempts
                                }
                              </strong>

                              <span>
                                Total Attempts
                              </span>
                            </div>

                            <div>
                              <strong>
                                {
                                  quiz.completed_attempts
                                }
                              </strong>

                              <span>
                                Completed
                              </span>
                            </div>

                            <div>
                              <strong>
                                {
                                  quiz.pending_attempts
                                }
                              </strong>

                              <span>
                                Processing
                              </span>
                            </div>

                            <div>
                              <strong>
                                {Number(
                                  quiz.average_percentage ||
                                    0
                                ).toFixed(
                                  1
                                )}
                                %
                              </strong>

                              <span>
                                Average Score
                              </span>
                            </div>
                          </div>
                        </article>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;