# Student Management System

A beginner-friendly student directory built with Node.js, Express, Mongoose, MongoDB, Bootstrap 5, and the Fetch API. The browser dashboard creates, lists, searches, views, edits, and deletes real MongoDB student records.

## Requirements

- Node.js 20 or newer and npm
- MongoDB Community Server running locally, or a MongoDB Atlas cluster
- Git (optional, for publishing to GitHub)

## Run locally

1. Install MongoDB Community Server and make sure the MongoDB service is running.
2. In this folder, install the Node.js packages:

   ```powershell
   npm install
   ```

3. Copy `.env.example` to `.env`. The included local `.env` already uses the connection string you supplied:

   ```dotenv
   MONGODB_URI=mongodb://localhost:27017/
   PORT=3000
   NODE_ENV=development
   ```

   Mongoose selects the `StudentDB` database, so the URI does not need to include a database name. For Atlas, replace `MONGODB_URI` with your Atlas connection URI. URL-encode special characters in the database password.

4. Start the server:

   ```powershell
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000). The server connects to MongoDB before it starts accepting requests. If MongoDB is unavailable, the startup error is printed and the server exits instead of pretending it is connected.

To run the tests, use `npm test`. For automatic restarts while developing, use `npm run dev`.

## Student record

Mongoose creates each document's MongoDB ObjectId and timestamps automatically. Records are stored in the `students` collection in `StudentDB` and contain:

```json
{
  "_id": "MongoDB-generated ObjectId",
  "name": "Rahul Sharma",
  "email": "rahul@example.com",
  "course": "Computer Engineering",
  "age": 20,
  "createdAt": "MongoDB date",
  "updatedAt": "MongoDB date"
}
```

Name, email, course, and age are required for new and updated data. Emails are normalized to lowercase and have a unique database index; duplicate addresses return HTTP `409`. The index applies to documents with an email, so older records missing that field remain intact. Invalid fields or ObjectIds return `400`; missing records return `404`.

## REST API

All responses use JSON. `POST` requires `name`, `email`, `course`, and `age`. `PUT` accepts one or more of those fields.

| Method | Route | Description | Success |
| --- | --- | --- | --- |
| `POST` | `/api/students` | Create a student | `201 Created` |
| `GET` | `/api/students` | List students, newest first | `200 OK` |
| `GET` | `/api/students/:id` | Get a student by ObjectId | `200 OK` |
| `PUT` | `/api/students/:id` | Update supplied student fields | `200 OK` |
| `DELETE` | `/api/students/:id` | Delete a student | `200 OK` |

### Postman

Import [`postman/Student-Management-System.postman_collection.json`](./postman/Student-Management-System.postman_collection.json) into Postman. The create request generates a unique email and saves its returned `_id`; the remaining requests use that ID and assert their expected responses. The collection initially uses `http://localhost:3000`.

Newman is included as a development dependency. With the app and MongoDB running, execute the entire five-request CRUD sequence and save a Markdown and JSON report:

```powershell
npm run test:api
```

The reports are written to `reports/newman-report.md` and `reports/newman-report.json`. The run creates a uniquely named temporary record and deletes that record at the end. If the collection's delete request fails, the runner attempts to clean up only the record created by that run and reports the cleanup result. To test a different API URL, set `API_BASE_URL` before running Newman.

## MongoDB Atlas

1. Sign in to MongoDB Atlas and create a free-tier cluster if available in your account/region.
2. In **Database Access**, create a database user with a strong password. Do not use your Atlas account password as the database credential.
3. In **Network Access**, allow your development machine's current IP address. For a hosted app, add the hosting provider's outbound IP addresses if available; avoid `0.0.0.0/0` except as a temporary, understood trade-off.
4. Select **Connect** for the cluster, choose the Node.js driver connection string, and replace the username/password placeholders. URL-encode special characters in the password.
5. Put the URI into your local `.env` as `MONGODB_URI=...`. Never commit `.env` or paste a credential into source code. The app creates `StudentDB` and `students` when the first record is saved.

## Deploy to Render

1. Create an empty GitHub repository named `student-management-system` (do not add a README or license; this folder already has a Git repository). Then, from this project folder, connect and push:

   ```powershell
   git branch -M main
   git remote add origin https://github.com/<your-username>/student-management-system.git
   git add .
   git commit -m "Build student management system"
   git push -u origin main
   ```

   Replace `<your-username>` with your GitHub username. The `.gitignore` excludes `.env` and `node_modules`.
2. In Render, create a **Web Service** connected to the repository.
3. Use **Build Command** `npm install` and **Start Command** `npm start`.
4. Add `MONGODB_URI` in the Render service's environment settings using the Atlas URI. Add `NODE_ENV=production` if desired; Render supplies `PORT`.
5. Ensure Atlas network access permits connections from the deployed service, deploy, and open the Render-provided URL. Test create, list, search, update, and delete against the deployed URL.

This project has not been published to GitHub or deployed to Render. A public URL requires your GitHub/Render access and a configured Atlas database. Do not share database credentials in chat.

## Project layout

```text
config/db.js                         MongoDB connection
models/Student.js                    Mongoose schema and model
routes/studentRoutes.js              Five REST API endpoints and validation
public/index.html                    Responsive dashboard
public/style.css                     Dashboard styling
public/script.js                     Fetch API and page interactions
tests/studentRoutes.test.js          Input and static-page tests
postman/Student-Management-System.postman_collection.json
server.js                            Express app and startup
.env.example                         Safe local configuration template
```

Bootstrap 5 and the dashboard font are loaded from public CDNs. An internet connection is needed for those external visual assets; the application data and API remain served by this Node.js app.

## Practical overview

Express serves the dashboard and parses JSON. The browser uses `fetch()` to call the REST API. The route handlers validate each request and use the Mongoose `Student` model to read or change MongoDB records. Mongoose connects to `StudentDB`, validates the schema, and creates the `students` collection and unique email index as needed. The dashboard searches the records loaded from the API by student name or ID.
