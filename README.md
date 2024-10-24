Thank you for the clarification! Since the TimeAPI doesn’t require an API key, I’ll modify the **README** accordingly and remove the part about needing a key in the `.env` file.

---

# SchedYouLater

**SchedYouLater** is a web-based application designed to help users find optimal times to schedule calls with their friends, taking time zone differences into account. The app allows users to view their own and their friends' schedules, find free time slots, and propose meeting times that work for both parties, automatically converting times to the correct time zone for each user.

## Inspiration

The inspiration for **SchedYouLater** came from the common struggle of coordinating calls or meetings between friends and colleagues living in different time zones. The process of trying to match schedules can lead to confusion, especially when people aren't sure how to convert times between time zones. **SchedYouLater** simplifies this process by automatically suggesting the best time slots for a call, ensuring that the proposed times work for everyone.

## Features
- User authentication: Register and log in with a username and password.
- Manage and view your own schedule.
- Add friends and view their schedules.
- Find optimal time slots to schedule calls between friends.
- Automatic time zone conversion between users and friends using TimeAPI.io.
- Clean and intuitive UI for easy scheduling.

## Tech Stack
- **Frontend**: React.js
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (Local Database)
- **Time Zone Conversion**: TimeAPI.io

## Getting Started

### Prerequisites

Make sure you have the following installed:
- **Node.js** (v14+)
- **PostgreSQL** (v12+)
- **npm** (Node Package Manager)

### Setting Up the Project

#### 1. Clone the Repository
First, clone the repository to your local machine.

```bash
git clone https://github.com/your-username/SchedYouLater.git
cd SchedYouLater
```

#### 2. Install Dependencies
Navigate into the project directory and install the required dependencies.

```bash
npm install
```

This will install all the dependencies required to run the frontend and backend of the application.

#### 3. Setting Up PostgreSQL Database

**SchedYouLater** uses PostgreSQL as the database. You'll need to set up a local PostgreSQL instance and create the necessary schema for the app to run.

1. Start your PostgreSQL server.
2. Create a new database called `scheduelater_db`:
   ```sql
   CREATE DATABASE scheduelater_db;
   ```

3. Connect to the database:
   ```bash
   psql -d scheduelater_db
   ```

4. Create the schema for the database using the `schema.sql` file provided in the project root directory. Run the following command to execute the schema:

   ```bash
   psql -d scheduelater_db -f schema.sql
   ```

   This will create the necessary tables:
   - `users`: Stores information about the users (username, password, timezone).
   - `friends`: Manages friendships between users.
   - `events`: Holds the user events, including start and end times of the event.

#### 4. Configure Environment Variables

You'll need to configure environment variables for the app to run. Create a `.env` file in the root of your project and add the following configuration:

```
DATABASE_URL=postgres://username:password@localhost:5432/scheduelater_db
PORT=5000
```

Replace `username` and `password` with your PostgreSQL credentials.

#### 5. Start the Server

To run the backend server, use the following command:

```bash
npm run server
```

The server will start at `http://localhost:5000`.

#### 6. Run the Frontend

In a separate terminal, run the frontend of the application:

```bash
npm start
```

This will start the React app, and you can access it at `http://localhost:3000`.

### API Usage for Time Conversion

This app uses **TimeAPI.io** to convert time zones between users and their friends. The API call for converting time between two time zones is handled in the app's backend, as shown below:

```javascript
const response = await axios.post('https://timeapi.io/api/Conversion/ConvertTimeZone', {
  fromTimeZone: currentUser.timezone,
  dateTime: slot.start.toISOString(),
  toTimeZone: friendTimezone,
});
```

This converts the time from the user's timezone to the friend's timezone.

### How to Use the App

1. **Register**: Sign up with your username, password, and time zone.
2. **Login**: Log in to the app using your credentials.
3. **Add Friends**: Search for friends by username and add them to your friends list.
4. **View Schedules**: See your schedule and your friends' schedules.
5. **Find Optimal Times**: Let the app suggest the best time for a call between you and your friend, taking time zones into account.

### Available Scripts

Here are the scripts you can use to manage the app:

- **`npm start`**: Runs the frontend React app.
- **`npm run server`**: Starts the Express.js backend server.
- **`npm run dev`**: Starts both the backend and frontend in development mode.

### Troubleshooting

- **Database Connection Error**: If the app cannot connect to the PostgreSQL database, ensure that your `DATABASE_URL` in `.env` is correctly configured and that PostgreSQL is running locally.

### Future Features

- **Notifications**: Automatic notifications when an optimal time is found.
- **Multiple Friend Scheduling**: Support for scheduling group calls across different time zones.
- **Mobile App**: Extend the functionality to mobile platforms for ease of scheduling on the go.

### Contributions

Contributions are welcome! Please fork this repository and submit a pull request with any improvements or bug fixes.

### License

This project is licensed under the MIT License.

---

Let me know if you need any further adjustments!