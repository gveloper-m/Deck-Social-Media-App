const { Client } = require('pg');
const cron = require('node-cron');

// PostgreSQL connection configuration
const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'Gveloper321',
    port: 5432 // PostgreSQL default port
});



function emptywall(){
    
    const empty = 'TRUNCATE TABLE wall;';

  
    client.query(empty);
    console.log("wall emptied");
   
}


// Connect to the database
client.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .then(setInterval(emptywall,21600000))
  .catch(err => console.error('Connection error', err.stack));


