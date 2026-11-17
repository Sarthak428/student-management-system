# Newman API Test Report

- Started: 2026-11-17T17:16:42.419Z
- Finished: 2026-11-17T17:16:43.121Z
- API base URL: http://localhost:3000
- Result: PASS (5/5 requests passed)

| Request | HTTP status | Result | Assertions |
| --- | ---: | :---: | --- |
| POST - Create Student | 201 Created | PASS | PASS: returns HTTP 201 Created<br>PASS: creates a student with a MongoDB ObjectId |
| GET - List Students | 200 OK | PASS | PASS: returns HTTP 200 OK<br>PASS: list contains the student created by this run |
| GET - Get Student by ID | 200 OK | PASS | PASS: returns HTTP 200 OK<br>PASS: returns the student created by this run |
| PUT - Update Student | 200 OK | PASS | PASS: returns HTTP 200 OK<br>PASS: returns the updated student fields |
| DELETE - Delete Student | 200 OK | PASS | PASS: returns HTTP 200 OK<br>PASS: deletes the student created by this run |
