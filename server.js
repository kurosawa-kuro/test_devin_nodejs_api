const express = require('express');
const fs = require('fs').promises;
const _ = require('lodash');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

let userCache = null;
let statsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000;

async function getCachedUsers() {
  const now = Date.now();
  if (!userCache || (now - cacheTimestamp) > CACHE_TTL) {
    try {
      const data = await fs.readFile('./data/users.json', 'utf8');
      userCache = JSON.parse(data);
      cacheTimestamp = now;
      statsCache = null;
    } catch (error) {
      throw new Error('Failed to load user data');
    }
  }
  return userCache;
}

app.get('/users', async (req, res) => {
  try {
    const users = await getCachedUsers();
    
    const usersWithDetails = users.map(user => ({
      ...user,
      ...getUserDetails(user.id)
    }));
    
    res.json(usersWithDetails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/stats', async (req, res) => {
  try {
    const now = Date.now();
    if (!statsCache || (now - cacheTimestamp) > CACHE_TTL) {
      const users = await getCachedUsers();
      
      const usersByCity = _.countBy(users, 'city');
      
      statsCache = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.active).length,
        averageAge: users.reduce((sum, u) => sum + u.age, 0) / users.length,
        usersByCity
      };
    }
    
    res.json(statsCache);
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate stats' });
  }
});

app.get('/process-data', (req, res) => {
  const largeArray = [];
  for (let i = 0; i < 100000; i++) {
    largeArray.push({
      id: i,
      data: 'x'.repeat(1000), // Creating large strings
      timestamp: new Date()
    });
  }
  
  const processed = largeArray.map(item => {
    return {
      ...item,
      processed: true,
      hash: generateHash(item.data) // Expensive operation for each item
    };
  });
  
  res.json({ count: processed.length, sample: processed.slice(0, 5) });
});

app.get('/external-data', async (req, res) => {
  try {
    const urls = [
      'https://jsonplaceholder.typicode.com/posts/1',
      'https://jsonplaceholder.typicode.com/posts/2',
      'https://jsonplaceholder.typicode.com/posts/3'
    ];
    
    const promises = urls.map(url => axios.get(url));
    const responses = await Promise.all(promises);
    const results = responses.map(response => response.data);
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch external data' });
  }
});

function getUserDetails(userId) {
  const details = {
    preferences: generateUserPreferences(),
    history: generateUserHistory(),
    recommendations: generateRecommendations()
  };
  
  const start = Date.now();
  while (Date.now() - start < 10) {
  }
  
  return details;
}

function generateHash(data) {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

function generateUserPreferences() {
  return { theme: 'dark', language: 'en', notifications: true };
}

function generateUserHistory() {
  return Array.from({ length: 50 }, (_, i) => ({
    action: `action_${i}`,
    timestamp: new Date(Date.now() - i * 86400000)
  }));
}

function generateRecommendations() {
  return Array.from({ length: 10 }, (_, i) => ({
    id: i,
    title: `Recommendation ${i}`,
    score: Math.random()
  }));
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
