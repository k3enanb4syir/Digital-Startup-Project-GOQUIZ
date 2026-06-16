# GoQuiz

GoQuiz is a scalable digital training and assessment platform. Trainers can create assessments, use reusable quiz templates, publish training codes, and view assessment analytics. Trainees can join assessments using a code, submit answers, and view their results.

The platform uses React, Node.js, PostgreSQL, Redis, RabbitMQ, Python, Nginx, and Docker.

## Main Features

- Trainer and trainee registration and login
- JWT authentication
- Role-based access
- Assessment creation
- Reusable training templates
- Quiz-code access
- Automatic scoring
- Trainee result tracking
- Trainer assessment analytics
- Redis caching
- RabbitMQ asynchronous scoring
- Docker deployment

## How to Run the Project

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git
```

Enter the project folder:

```bash
cd YOUR_REPOSITORY_NAME
```

Replace `YOUR_USERNAME` and `YOUR_REPOSITORY_NAME` with the actual GitHub username and repository name.

### 2. Start Docker Desktop

Open Docker Desktop and wait until Docker is running.

### 3. Start GoQuiz

Run this command inside the project folder:

```bash
docker compose up --build
```

Wait until all containers are running.

### 4. Open the platform

Open the following address in your browser:

```text
http://localhost:8080
```

## How to Use the Platform

### Step 1: Register as a trainer

Create an account using the **Trainer / Admin** role.

Example:

```text
Name: Trainer Demo
Email: trainer@example.com
Password: 123456
Role: Trainer / Admin
```

Login using the trainer account.

### Step 2: Create an assessment

Open **Training Modules** from the sidebar.

The trainer can create an assessment manually or select one of the reusable training templates.

Enter the assessment title, description, questions, answer options, and correct answers.

Click **Publish Training Assessment**.

The platform will generate a training code, such as:

```text
ABC123
```

Save this code for the trainee.

### Step 3: Register as a trainee

Logout from the trainer account and create another account using the **Partner / Trainee** role.

Example:

```text
Name: Trainee Demo
Email: trainee@example.com
Password: 123456
Role: Partner / Trainee
```

Login using the trainee account.

### Step 4: Join the assessment

Open **Training Modules**.

Enter the training code created by the trainer and click **Join**.

### Step 5: Submit the assessment

Answer every question and click **Submit Assessment**.

The submission is sent to RabbitMQ and scored automatically by the Python scoring worker.

### Step 6: View the result

Open **Assessment Results**.

The result may first show `PENDING`. Wait a few seconds and refresh the results.

The status should change to `COMPLETED`, and the final score will appear.

### Step 7: View trainer analytics

Login again using the trainer account.

Open **Assessment Results** to view:

- Total attempts
- Completed submissions
- Pending submissions
- Average assessment score

## RabbitMQ Dashboard

Open:

```text
http://localhost:15672
```

Login using:

```text
Username: guest
Password: guest
```

The scoring tasks are processed through the `scoring_queue`.

## Stop the Platform

To stop the platform:

```bash
docker compose down
```

To start it again:

```bash
docker compose up --build
```

To remove all saved users, assessments, submissions, and results:

```bash
docker compose down -v
```

> Warning: This command deletes the local database volume.
````
