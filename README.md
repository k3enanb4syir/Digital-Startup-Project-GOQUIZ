````markdown
# 🟢 GoQuiz

GoQuiz is a scalable digital training and assessment platform where trainers can create assessments and trainees can complete them using a training code.

The platform supports reusable assessment templates, automatic scoring, trainee result tracking, and trainer analytics.

## Main Features

- Trainer and trainee registration and login
- JWT-based authentication
- Role-based access
- Training assessment creation
- Reusable training templates
- Training-code access
- Automatic scoring
- Trainee result history
- Trainer assessment analytics
- Redis caching
- RabbitMQ asynchronous processing
- Docker-based deployment

## Technology Stack

- React and Vite
- Node.js and Express
- Python
- PostgreSQL
- Redis
- RabbitMQ
- Nginx
- Docker Compose

---

## How to Run the Project

### 1. Install the Requirements

Make sure you have installed:

- Git
- Docker Desktop
- Visual Studio Code or another code editor

You do not need to install PostgreSQL, Redis, RabbitMQ, Node.js, or Python separately because they run inside Docker containers.

### 2. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git
````

Enter the project folder:

```bash
cd YOUR_REPOSITORY_NAME
```

Replace `YOUR_USERNAME` and `YOUR_REPOSITORY_NAME` with the correct GitHub information.

### 3. Start Docker Desktop

Open Docker Desktop and wait until the Docker engine is running.

### 4. Start GoQuiz

Inside the project folder, run:

```bash
docker compose up --build
```

Wait until all containers have started.

### 5. Open the Platform

Open this address in your browser:

```text
http://localhost:8080
```

---

## How to Use the Platform

### Step 1: Register as a Trainer

Open the registration page and create an account using:

```text
Name: Trainer Demo
Email: trainer@example.com
Password: 123456
Account Type: Trainer / Admin
```

After registration, log in using the trainer account.

### Step 2: Open Training Modules

Click **Training Modules** from the sidebar.

The trainer can:

* Create a new assessment manually
* Select a reusable training template
* Edit assessment questions and answers
* Publish the assessment

### Step 3: Create and Publish an Assessment

Enter the following information:

* Assessment title
* Description
* Questions
* Answer options
* Correct answers

Alternatively, select a template and click **Use Template**.

After editing the assessment, click:

```text
Publish Training Assessment
```

The platform will generate a training code.

Example:

```text
ABC123
```

Save the code because the trainee will use it to join the assessment.

### Step 4: Register as a Trainee

Log out from the trainer account.

Create another account using:

```text
Name: Trainee Demo
Email: trainee@example.com
Password: 123456
Account Type: Partner / Trainee
```

Log in using the trainee account.

### Step 5: Join the Assessment

Click **Training Modules**.

Enter the training code created by the trainer and click:

```text
Join
```

The assessment questions will appear.

### Step 6: Submit the Assessment

Answer every question and click:

```text
Submit Assessment
```

The submission will be sent to RabbitMQ and processed automatically by the Python scoring worker.

### Step 7: View the Trainee Result

Click **Assessment Results**.

The result may initially show:

```text
PENDING
```

Wait a few seconds and click the refresh button.

The status should change to:

```text
COMPLETED
```

The final score will then be displayed.

### Step 8: View Trainer Analytics

Log out and sign in again using the trainer account.

Click **Assessment Results**.

The trainer can view:

* Total assessment attempts
* Completed submissions
* Pending submissions
* Average score for each assessment

---

## RabbitMQ Dashboard

Open the RabbitMQ dashboard at:

```text
http://localhost:15672
```

Login using:

```text
Username: guest
Password: guest
```

The assessment scoring jobs are processed through:

```text
scoring_queue
```

---

## Stop the Platform

To stop all containers, run:

```bash
docker compose down
```

To start the platform again:

```bash
docker compose up --build
```

To delete all saved users, assessments, submissions, and results:

```bash
docker compose down -v
```

> Warning: The `-v` command permanently deletes the local database volume.

```
```
