// app.js
const express = require('express');
const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure the PostgreSQL connection
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Serve static files from the "public" folder
app.use(express.static('public'));

// Fetch data from API and store in database
async function fetchAndStoreData() {
    try {
        // Call the tickers API
        const response = await axios.get('https://api.wazirx.com/api/v2/tickers');

        // Log the data received from the API
        console.log('Data received from API:', response.data);

        // Convert the response object to an array and select the top 10 stocks by volume
        const stocks = Object.values(response.data)
            .sort((a, b) => b.volume - a.volume) // Sort by volume in descending order
            .slice(0, 10); // Take the top 10 stocks

        // Clear the stocks table before inserting new data
        await pool.query('TRUNCATE TABLE stocks');

        const insertQuery = `INSERT INTO stocks (name, last, buy, sell, volume, base_unit)
                             VALUES ($1, $2, $3, $4, $5, $6)`;

        // Insert the top 10 stocks into the database
        for (let ticker of stocks) {
            const { name, last, buy, sell, volume, base_unit } = ticker; // Ensure these fields exist in the response
            
            // Execute the insert query with the ticker data
            await pool.query(insertQuery, [name, last, buy, sell, volume, base_unit]);
        }
    } catch (error) {
        console.error('Error fetching and storing data:', error);
        if (error.response) {
            console.error('API response data:', error.response.data);
            console.error('API status:', error.response.status);
        }
    }
}

// Endpoint to retrieve data from database
app.get('/api/stocks', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM stocks');
        res.json(result.rows); // Return the stocks data as JSON
    } catch (error) {
        console.error('Error retrieving stocks from database:', error);
        res.status(500).send('Server Error');
    }
});

// New endpoint to retrieve tickers data from the database
app.get('/api/tickers', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM stocks');
        res.json(result.rows); // Return the stocks data as JSON
    } catch (error) {
        console.error('Error retrieving tickers from database:', error);
        res.status(500).send('Server Error');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    fetchAndStoreData(); // Fetch and store data on server start
});
