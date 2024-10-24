import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './App.css';


// Example list of time zones
const timezones = [
  "America/New_York", "America/Chicago", "America/Los_Angeles", "Europe/London", "Europe/Paris",
  "Asia/Dubai", "Asia/Tokyo", "Asia/Kolkata", "Australia/Sydney", "UTC"
];

const localizer = momentLocalizer(moment);

// TimeAPI.io API URL 
const TIME_API_URL = "https://timeapi.io/api/Conversion/ConvertTimeZone";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [timezone, setTimezone] = useState('');
  const [friendUsername, setFriendUsername] = useState('');
  const [friends, setFriends] = useState([]);
  const [newEvent, setNewEvent] = useState({ title: '', startTime: '', endTime: '' });
  const [events, setEvents] = useState([]);
  const [friendEvents, setFriendEvents] = useState([]);  // Friend's events for calendar
  const [isModalOpen, setIsModalOpen] = useState(false); // To control modal visibility
  const [callDuration, setCallDuration] = useState(''); // Call duration in minutes
  const [optimalTimes, setOptimalTimes] = useState([]); // Optimal times for the call
  const [selectedFriendId, setSelectedFriendId] = useState(null);
  const [showOptimalTimeModal, setShowOptimalTimeModal] = useState(false); // To control the "Find Optimal Time" modal
  const [friendTimezone, setFriendTimezone] = useState(''); // Friend's timezone


  // Check localStorage for user info when the app loads
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
      fetchFriendsAndEvents(user.id);
    }
  }, []);

  // Fetch user's friends and events
  const fetchFriendsAndEvents = async (userId) => {
    try {
      const friendsResponse = await axios.get(`http://localhost:5000/friends/${userId}`);
      setFriends(friendsResponse.data);

      const eventsResponse = await axios.get(`http://localhost:5000/schedule/${userId}`);
      setEvents(
        eventsResponse.data.map(event => ({
          title: event.title,
          start: new Date(event.start_time), // Keep in UTC
          end: new Date(event.end_time),     // Keep in UTC
        }))
      );
    } catch (error) {
      console.error('Error fetching friends and events:', error);
    }
  };

  // Register new user with timezone
  const handleRegister = async () => {
    try {
      const response = await axios.post('http://localhost:5000/register', { username, password, timezone });
      setCurrentUser(response.data);
      localStorage.setItem('currentUser', JSON.stringify(response.data));
      setUsername('');
      setPassword('');
      setTimezone('');
      fetchFriendsAndEvents(response.data.id);
    } catch (error) {
      alert(error.response.data.message);
    }
  };

  // Login user
  const handleLogin = async () => {
    try {
      const response = await axios.post('http://localhost:5000/login', { username, password });
      setCurrentUser(response.data);
      localStorage.setItem('currentUser', JSON.stringify(response.data));
      setUsername('');
      setPassword('');
      fetchFriendsAndEvents(response.data.id);
    } catch (error) {
      alert('Invalid credentials');
    }
  };

  // Logout user
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setFriends([]);
    setEvents([]);
  };

  // Add a new event 
  const handleAddEvent = () => {
    const utcStartTime = new Date(newEvent.startTime).toISOString();  // Convert to UTC
    const utcEndTime = new Date(newEvent.endTime).toISOString();      // Convert to UTC

    axios.post('http://localhost:5000/add-event', {
      userId: currentUser.id,
      title: newEvent.title,
      startTime: utcStartTime,
      endTime: utcEndTime
    })
    .then(response => {
      setNewEvent({ title: '', startTime: '', endTime: '' });
      setEvents([...events, {
        title: response.data.title,
        start: new Date(response.data.start_time),
        end: new Date(response.data.end_time),
      }]);
    })
    .catch(error => {
      alert(error.response.data.message);
    });
  };

  // Add a friend by username
  const handleAddFriend = () => {
    axios.post('http://localhost:5000/add-friend', { userId: currentUser.id, friendUsername })
      .then(response => {
        alert(`${friendUsername} added as a friend`);
        setFriendUsername('');
        fetchFriendsAndEvents(currentUser.id);
      })
      .catch(error => {
        alert(error.response.data.message);
      });
  };

  // Fetch friend's events and open the modal (convert UTC to current user's timezone using API)
  const handleShowFriendCalendar = async (friendId) => {
    try {
      // Fetch friend's schedule
      const response = await axios.get(`http://localhost:5000/schedule/${friendId}`);
      
      // Fetch friend's time zone from the users table
      const friendResponse = await axios.get(`http://localhost:5000/user/${friendId}`);
      const friendTimezone = friendResponse.data.timezone;
      console.log('Friend timezone:', friendTimezone);
      
      // Map through the events and convert the start and end times to the current user's time zone
      const events = await Promise.all(response.data.map(async (event) => {
        // Convert the event's start and end times from the friend's time zone to the current user's time zone
        const startTime = await convertTimeToUserTimezone(event.start_time, friendTimezone, currentUser.timezone);
        const endTime = await convertTimeToUserTimezone(event.end_time, friendTimezone, currentUser.timezone);

        console.log('In show friends calendar', startTime, endTime);

        // Return the event with the converted start and end times
        return {
          title: event.title,
          start: startTime, // Converted to user's time zone
          end: endTime,     // Converted to user's time zone
        };
      }));

      // Set the friend's events to display in the calendar
      setFriendEvents(events);
      setIsModalOpen(true);  // Open the modal to show friend's calendar
    } catch (error) {
      console.error('Error fetching friend\'s schedule:', error);
    }
};

  // Find optimal time for a call with a friend
  const handleFindOptimalTime = async (friendId, duration) => {
    try {
      // Fetch friend's timezone and events
      const friend = await axios.get(`http://localhost:5000/user/${friendId}`);
      const friendTimezone = friend.data.timezone;
      setFriendTimezone(friendTimezone);
  
      const friendData = await axios.get(`http://localhost:5000/schedule/${friendId}`);
      const friendEvents = friendData.data.map(event => ({
        start: new Date(event.start_time),
        end: new Date(event.end_time),
      }));
  
      // Fetch current user's events
      const userEvents = events.map(event => ({
        start: new Date(event.start),
        end: new Date(event.end),
      }));
  
      const freeTimes = [];
  
      // Fallback time window (if no events are found)
      const fallbackStart = new Date(); // Today at 9 AM
      fallbackStart.setHours(9, 0, 0, 0); // Set the time to 9 AM
      const fallbackEnd = new Date(); // Today at 9 PM
      fallbackEnd.setHours(21, 0, 0, 0); // Set the time to 9 PM
  
      // If friend has no events, use the fallback time window
      if (friendEvents.length === 0) {
        friendEvents.push({ start: fallbackStart, end: fallbackEnd });
      }
  
      // If user has no events, use the fallback time window
      if (userEvents.length === 0) {
        userEvents.push({ start: fallbackStart, end: fallbackEnd });
      }
  
      // Function to find free time slots between events
      const findFreeSlots = (events, start, end, duration) => {
        let freeSlots = [];
        let currentStart = new Date(start);
  
        // Sort events by start time
        events.sort((a, b) => a.start - b.start);
  
        // Check gaps between events for free time
        for (let event of events) {
          if (currentStart < event.start && (event.start - currentStart) >= duration) {
            freeSlots.push({ start: new Date(currentStart), end: new Date(currentStart.getTime() + duration) });
            if (freeSlots.length >= 5) return freeSlots; // Stop once we have 5 slots
          }
          currentStart = new Date(Math.max(currentStart, event.end));
        }
  
        // Check remaining time after last event
        if (currentStart < end && (end - currentStart) >= duration) {
          freeSlots.push({ start: new Date(currentStart), end: new Date(currentStart.getTime() + duration) });
        }
  
        return freeSlots;
      };
  
      // Convert call duration from minutes to milliseconds
      const callDurationInMs = duration * 60 * 1000;
  
      // Find free time slots for both the user and the friend
      const userFreeSlots = findFreeSlots(userEvents, fallbackStart, fallbackEnd, callDurationInMs);
      const friendFreeSlots = findFreeSlots(friendEvents, fallbackStart, fallbackEnd, callDurationInMs);
  
      // Find overlapping free slots between user and friend
      let overlappingSlots = [];
      for (let userSlot of userFreeSlots) {
        for (let friendSlot of friendFreeSlots) {
          const overlapStart = new Date(Math.max(userSlot.start, friendSlot.start));
          const overlapEnd = new Date(Math.min(userSlot.end, friendSlot.end));
  
          if ((overlapEnd - overlapStart) >= callDurationInMs) {
            overlappingSlots.push({ start: overlapStart, end: overlapEnd });
            if (overlappingSlots.length >= 5) break; // Stop once we have 5 slots
          }
        }
        if (overlappingSlots.length >= 5) break; // Stop once we have 5 slots
      }
  
      // If no overlapping free times are found, use the fallback window
      if (overlappingSlots.length === 0) {
        freeTimes.push({ start: fallbackStart, end: new Date(fallbackStart.getTime() + callDurationInMs) });
      } else {
        freeTimes.push(...overlappingSlots.slice(0, 5)); // Only push up to 5 slots
      }
  
      console.log('Free times:', freeTimes);
      return setOptimalTimes(freeTimes);
    } catch (error) {
      console.error('Error finding optimal time:', error);
    }
  };
  
  
  


  // Close the modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setShowOptimalTimeModal(false);  // Close both modals when closing
  };
  

  function formatDateToCustomFormat(isoDate) {
    const date = new Date(isoDate);
  
    // Extract date parts
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed, so +1
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
  
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  // Time zone conversion API function using timeapi.io
  const convertTimeToUserTimezone = async (time, fromTimezone, toTimezone) => {
    const newTime = formatDateToCustomFormat(time);
    console.log('Converting time:', newTime, 'from', fromTimezone, 'to', toTimezone);

    try {
      // Call timeapi.io to convert the time from one timezone to another
      const response = await axios.post(TIME_API_URL, {
        fromTimeZone: fromTimezone,  // Friend's time zone (or source time zone)
        dateTime: newTime,  // Time in ISO format
        toTimeZone: toTimezone, // User's time zone (or target time zone)
        dstAmbiguity: ""  // Optional field for handling DST ambiguities
      });
      console.log('Converted time:', response.data.conversionResult.dateTime);

      //date time is in format 2024-10-23T06:00:00

      // Return the converted time.... to do
      return new Date(response.data.conversionResult.dateTime);
    } catch (error) {
      console.error('Error converting time zone:', error);
      return new Date(time);  // Fallback to original time if the API fails
    }
};


  return (

    <div>
      
      {!currentUser ? (
        <div className='User-auth-page'>
          <h1>SchedYouLater!</h1>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          
          {/* Dropdown for Timezone */}
          <select value={timezone} onChange={e => setTimezone(e.target.value)}>
            <option value="">Select Timezone</option>
            {timezones.map(tz => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>

          <button onClick={handleLogin}>Login</button>
          <button onClick={handleRegister}>Register</button>
        </div>
      ) : (
        <div className='home-page'>
          <h1>Welcome, {currentUser.username}</h1>
          <div className='user-info'>
          <button onClick={handleLogout}>Logout</button>

          <h2>Your Friends</h2>
          <ul>
            {friends.map(friend => (
              <li key={friend.id}>
                {/* Show Friend's Calendar */}
                <a href="#" onClick={() => handleShowFriendCalendar(friend.id)}>{friend.username}</a>

                {/* Find Optimal Time */}
                <button onClick={() => { setSelectedFriendId(friend.id); setIsModalOpen(true); setShowOptimalTimeModal(true); }}>
                  Find Optimal Time
                </button>
              </li>
            ))}
          </ul>

          {/* Friend adding form */}
          <h2>Add a Friend</h2>
          <input
            type="text"
            placeholder="Friend's Username"
            value={friendUsername}
            onChange={e => setFriendUsername(e.target.value)}
          />
          <button onClick={handleAddFriend}>Add Friend</button> {/* Now using handleAddFriend */}
          </div>
          <div className='add-event'>
          <h3>Add Event to Your Calendar</h3>
          <input
            type="text"
            placeholder="Event Title"
            value={newEvent.title}
            onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
          />
          <input
            type="datetime-local"
            placeholder="Start Time"
            value={newEvent.startTime}
            onChange={e => setNewEvent({ ...newEvent, startTime: e.target.value })}
          />
          <input
            type="datetime-local"
            placeholder="End Time"
            value={newEvent.endTime}
            onChange={e => setNewEvent({ ...newEvent, endTime: e.target.value })}
          />
          <button onClick={handleAddEvent}>Add Event</button>
          </div>

          <h2>Your Calendar</h2>
          <Calendar
            localizer={localizer}
            events={events.map(event => ({
              title: event.title,
              start: new Date(event.start), // Show in user's timezone (React Big Calendar accepts valid Date objects)
              end: new Date(event.end),     // Show in user's timezone
            }))}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 500, margin: "50px" }}
          />

          {/* Modal to show friend's calendar */}
          {/* Modal to input call duration and show the optimal times */}
          <Modal isOpen={isModalOpen && !showOptimalTimeModal} onClose={handleCloseModal}>
            <Calendar
              localizer={localizer}
              events={friendEvents.length > 0 ? friendEvents.map(event => ({
                title: event.title,
                start: new Date(event.start),
                end: new Date(event.end),
              })) : []}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 400, margin: "50px" }}
            />
            {friendEvents.length === 0 && <p>This friend has no scheduled events.</p>}
          </Modal>

          {/* Modal to input call duration and show the optimal times */}
          <Modal isOpen={isModalOpen && showOptimalTimeModal} onClose={handleCloseModal}>
            <h2>Find Optimal Call Time</h2>
            <input
              type="number"
              placeholder="Call duration (minutes)"
              value={callDuration}
              onChange={(e) => setCallDuration(e.target.value)}
            />
            <button onClick={() => handleFindOptimalTime(selectedFriendId, callDuration)}>Find Optimal Time</button>

            {optimalTimes.length > 0 && (
            <div>
              {optimalTimes.map((slot, index) => {
                // User's local time
                const userStartTime = slot.start.toLocaleString(undefined, {
                  hour: 'numeric',
                  minute: 'numeric',
                  hour12: true, // 12-hour format
                });
                const userEndTime = slot.end.toLocaleString(undefined, {
                  hour: 'numeric',
                  minute: 'numeric',
                  hour12: true, // 12-hour format
                });
                
                console.log("friendTimezone", friendTimezone);  
                console.log("users timezone", currentUser.timezone);
                // Friend's local time -> convert user start and end time to friend's timezone
                const friendStartTime = slot.start.toLocaleString(undefined, {
                  hour: 'numeric',
                  minute: 'numeric',
                  hour12: true, // 12-hour format
                  timeZone: friendTimezone,
                });
                const friendEndTime = slot.end.toLocaleString(undefined, {
                  hour: 'numeric',
                  minute: 'numeric',
                  hour12: true, // 12-hour format
                  timeZone: friendTimezone,
                });
                

                // Formatting the date for display
                const callDate = slot.start.toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'long',
                });

                return (
                  <div key={index}>
                    <p>
                      You can call your friend on {callDate} from {userStartTime} to {userEndTime}, 
                      which would be {friendStartTime} to {friendEndTime} for your friend.
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          </Modal>

        </div>
      )}
    </div>
  );
}

export default App;

// Modal Component
const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <button onClick={onClose} style={modalStyles.closeButton}>Close</button>
        {children}
      </div>
    </div>
  );
};

const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    maxWidth: '600px',
    width: '100%',
  },
  closeButton: {
    float: 'right',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    padding: '5px 10px',
    cursor: 'pointer',
    borderRadius: '5px',
  },
};
