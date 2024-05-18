const express = require('express');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;
const { Pool } = require('pg');
const cache = require('memory-cache');
const { Console } = require('console');
const { stdin, getuid } = require('process');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'Gveloper321',
  port: 5432 // PostgreSQL default port
});

function cryptography(password) {
  const hash = crypto.createHash('sha256');
  hash.update(password);
  return hash.digest('hex');
}





pool.connect((err, client, done) => {
  if (err) {
    console.error('Error connecting to PostgreSQL database:', err);
  } else {
    console.log('Connected to PostgreSQL database!');
  }
});

app.use((req, res, next) => {
  console.log('Incoming request:', req.method, req.url);
  next();
});

app.get('/newuser', (req, res) => {
  app.get('/clear-cache', (req, res) => {
    cache.clear();
    res.send('Cache cleared successfully.');
  });

  const udata = req.query.word;
  const [uname, upass, umail, uage, ufor, uabout] = udata.split(',');

  console.log("Username:", uname);
  const hashedPassword = cryptography(upass);
  console.log("Hashed Password:", hashedPassword);
  console.log("Email:", umail);
  console.log("Age:", uage);
  console.log("interests:", ufor);
  console.log("About:", uabout);

  const userData = {
    user_name: uname,
    password: hashedPassword,
    email: umail
  };

  const sqlinsert = 'INSERT INTO users(user_name, password, email) VALUES($1, $2, $3)';

  pool.query(sqlinsert, [userData.user_name, userData.password, userData.email], (error, results) => {
    if (error) {
      console.error('Error inserting data:', error);
      return res.status(500).send('Error inserting data');
    }
    console.log('Data inserted successfully.');
    res.send('Connection established data sent');
  });
});

app.get('/login', (req, res) => {
  const udata = req.query.word;
  const [namelogin, passlogin] = udata.split(',');
  const Hpasslogin = cryptography(passlogin);

  const sqlsearch = "SELECT * FROM users WHERE user_name = $1 AND password = $2";

  pool.query(sqlsearch, [namelogin, Hpasslogin], (error, results) => {
    if (error) {
      console.error('Error executing query:', error);
      return res.status(500).send('Error executing query');
    }
    if (results.rows.length > 0) {
      res.json(results.rows[0].id);
    } else {
      res.status(404).send('User not found');
    }
  });
});

app.get('/rememberme', (req, res) => {

    const uid = req.query.word;

    console.log("The id i retrieved from the device is " + uid);


    const resultid = "SELECT * FROM users WHERE id = $1;";

    
    pool.query(resultid, [uid], (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            return res.status(500).send('Error executing query');
        }
        if (results.rows.length > 0) {
            res.json(true);
            console.log("exists");
        } else {
            res.status(404).send(false);

        }
    });
    

});

app.get('/loadhomepage', (req, res) => {
    const uid = req.query.word; // Retrieve the user ID from the query parameters

    const sqlsearch = "SELECT user_name, followers, places from users WHERE id = $1";
    pool.query(sqlsearch, [uid], (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            return res.status(500).send('Error executing query');
        }
        if (results.rows.length > 0) {
            console.log(results.rows[0].id); // Log the ID to check if it's available
            res.json(results.rows[0]); // Return the entire row as JSON, including id
        } else {
            res.status(404).send('User not found');
        }
    });
});


function haversine(lat1, lon1, lat2, lon2) {
    // Convert latitude and longitude from degrees to radians
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
}



app.get('/senddin', (req, res) => {
    const dindata = req.query.word; // Get the distance, latitude, and longitude

    const dataArray = dindata.split(',');

    const slidervalue = dataArray[0]; 
    const longitude = dataArray[1];
    const latitude = dataArray[2];
    const userid = dataArray[3]; 

    console.log("slidervalue:", slidervalue);
    console.log("Longitude:", longitude);
    console.log("Latitude:", latitude);
    console.log("user id:", userid);

    const sqlUpdate = "UPDATE users SET long = $2, lat = $3 WHERE id = $1";

    pool.query(sqlUpdate, [userid, longitude, latitude], (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            console.log('Error executing query');
        }
        if (results.rowCount > 0) {
            console.log('Row updated successfully');
        } else {
            console.log('Row with the provided id not found');
        }
    });

    const sqlSearch = "SELECT * FROM users WHERE long IS NOT NULL AND lat IS NOT NULL AND id != $1";

    var namestosend = [];
    var distancetosend = [];

    pool.query(sqlSearch, [userid], async (searchError, searchResults) => {
      if (searchError) {
          console.error('Error searching for rows:', searchError);
      } else {
          const namestosend = [];
          const distancetosend = [];
          
          for (const row of searchResults.rows) {
              console.log('Longitude:', row.long, 'Latitude:', row.lat);
  
              // Calculate the distance
              const distance = haversine(latitude, longitude, row.lat, row.long);
  
              if (distance < slidervalue) {
                  console.log("the id for this user is " + row.id);
                  namestosend.push(row.user_name);
                  distancetosend.push(distance);
                  console.log(distance);
              }
          }
  
          try {
              const retrievemyfollowers = "SELECT followers FROM USERS WHERE id = $1";
              const result = await pool.query(retrievemyfollowers, [userid]);
              const followers = result.rows[0].followers;
  
              res.json({ names: namestosend, distances: distancetosend, followers });
          } catch (followersError) {
              console.error('Error retrieving followers:', followersError);
              res.status(500).json({ error: 'Internal Server Error' });
          }
      }
  });
});

app.get('/profdata', async (req, res) => {
  try {
    const [name, uid, value] = req.query.word.split(',');

    const sqlsearchuser = `SELECT * FROM users WHERE user_name = $1;`;

    const { rows } = await pool.query(sqlsearchuser, [name]);

    if (rows.length > 0) {
      console.log('Data retrieved successfully.');
      res.send(rows);
    } else {
      res.status(404).send('User not found');
    }
  } catch (error) {
    console.error('Error searching data:', error);
    res.status(500).send('Error searching data');
  }
});

app.get('/follow', async (req, res) => {
  const followdata = req.query.word;
  const [follows, followed, value] = followdata.split(',');
  console.log(follows, followed, value);
 
    const queryText = 'SELECT COUNT(*) FROM follower WHERE follower_name = $1 AND followed_name = $2';
    const result = await pool.query(queryText, [follows, followed]);  
    const count = parseInt(result.rows[0].count);

    if (count > 0) {
      res.send(true);
    } else {
      if (value === undefined){
      const insertQuery = 'INSERT INTO follower (follower_name, followed_name) VALUES ($1, $2)';
      await pool.query(insertQuery, [follows, followed]);

      const plusfollower = 'UPDATE users SET followers = followers + 1 WHERE user_name = $1;'
      await pool.query(plusfollower, [followed]);
      }
      res.send(false);
  }
});


app.get('/unfollow', async (req, res) => {
  try {
    const [follower, followed] = req.query.word.split(',');
    const queryText = 'DELETE FROM follower WHERE follower_name = $1 AND followed_name = $2 RETURNING true';
    const result = await pool.query(queryText, [follower, followed]);

    const minusfollower = 'UPDATE users SET followers = followers - 1 WHERE user_name = $1;'
    await pool.query(minusfollower, [followed]);
    res.send(result.rowCount > 0);
  } catch (error) {
    console.error('Error while unfollowing:', error);
    res.send(false);
  }
});


app.get('/wall', async (req, res) => {


  const walldata = req.query.word;


  const [lat,long] = walldata.split(',');

  console.log(lat,long);





  const getcomment = 'SELECT * FROM wall ORDER BY id DESC;'

  const result = await pool.query(getcomment);



  for(let i = 0;i<result.rows.length;i++){
    console.log(result.rows[i].lat,result.rows[i].long);

    let tempdistance = haversine(lat,long,result.rows[i].lat,result.rows[i].long);

    if(tempdistance>=51){

      result.rows.splice(i,1);


    }


  }
  
  res.json(result.rows);

});

app.get('/postwall', async (req, res) => {
  try {
    const postdata = req.query.word;
    const [id, post, latitude, longitude] = postdata.split(',');

    console.log(id);
    const selectNameQuery = 'SELECT user_name FROM users WHERE id = $1';
    const result = await pool.query(selectNameQuery, [id]);

    const name = result.rows[0].user_name;
    console.log(name);

    const insertPostQuery = 'INSERT INTO wall (username, text, lat, long) VALUES ($1, $2, $3, $4)';
    await pool.query(insertPostQuery, [name, post, latitude, longitude]);

    res.status(200).send('Post successfully added');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});



app.get('/following', async (req, res) => {
  const id = req.query.word.split(',')[0];

  const getfollowing = 'Select followed_name from follower where follower_name = $1';
  const data = await pool.query(getfollowing, [id]);

  const names = data.rows.map(row => row.followed_name);
  res.send(names);


});


app.get('/changeabout', async (req, res) => {
  const recdata = req.query.word;
  const [id, about] = recdata.split(',');

  console.log(id,about);

  const setnewabout = 'UPDATE users SET about=$1 WHERE id=$2;';
  await pool.query(setnewabout, [about, id]); 

});

app.get('/changename', async (req, res) => {
  const recdata = req.query.word;
  const [id, name] = recdata.split(',');

  console.log(id,name);

  const setnewabout = 'UPDATE users SET user_name=$1 WHERE id=$2;';
  await pool.query(setnewabout, [name, id]); 

});


app.get('/getdm', async (req, res) => {
  const recdata = req.query.word;
  const [name, id] = recdata.split(',');

  console.log(id, name);

  const searchm1 = 'SELECT * FROM messages WHERE sid = $1 AND receiver = $2;';
  const searchm2 = 'SELECT * FROM messages WHERE sender = $1 AND rid = $2;';

  const messageResult1 = await pool.query(searchm1, [id, name]);
  const messageResult2 = await pool.query(searchm2, [name, id]);

  const messages1 = messageResult1.rows;
  const messages2 = messageResult2.rows;

  const fdms = [];
  const maxLength = Math.max(messages1.length, messages2.length);

  for (let i = 0; i < maxLength; i++) {
    if (i < messages1.length) {
        fdms.push(messages1[i]);
    }
    if (i < messages2.length) {
        fdms.push(messages2[i]);
    }
}

  console.log(messages1, messages2);

  res.send(fdms);
});


app.get('/sendmessage', async (req, res) => {
  try {
    const recdata = req.query.word;
    const [storedid, message, name] = recdata.split(',');

    const getmynameQuery = 'SELECT user_name FROM users WHERE id = $1';
    const mynameResult = await pool.query(getmynameQuery, [storedid]);
    const myname = mynameResult.rows[0].user_name;

    const getidQuery = 'SELECT id FROM users WHERE user_name = $1';
    const OtheridResult = await pool.query(getidQuery, [name]);
    const Otherid = OtheridResult.rows[0].id;

    console.log(storedid, myname, message, Otherid, name);

    const savemessageQuery = 'INSERT INTO messages (sid, sender, rid, receiver, message) VALUES ($1, $2, $3, $4, $5)';
    await pool.query(savemessageQuery, [storedid, myname, Otherid, name, message]);

    res.status(200).send("Message sent successfully.");
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).send("Error sending message.");
  }
});


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});