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
const CACHE_TTL = 60000; // 1 minute

async function getCachedUsers() {
  const now = Date.now();
  if (!userCache || (now - cacheTimestamp) > CACHE_TTL) {
    try {
      const data = await fs.readFile('./data/users.json', 'utf8');
      userCache = JSON.parse(data);
      cacheTimestamp = now;
      statsCache = null; // Invalidate stats cache when user data changes
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
      ...getUserDetailsOptimized(user.id)
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
  try {
    const chunkSize = 1000;
    const totalItems = 100000;
    const chunks = Math.ceil(totalItems / chunkSize);
    
    let processedCount = 0;
    const sampleResults = [];
    
    for (let chunk = 0; chunk < chunks; chunk++) {
      const chunkStart = chunk * chunkSize;
      const chunkEnd = Math.min(chunkStart + chunkSize, totalItems);
      
      for (let i = chunkStart; i < chunkEnd; i++) {
        processedCount++;
        
        if (sampleResults.length < 5) {
          sampleResults.push({
            id: i,
            processed: true,
            hash: generateHashOptimized(`data_${i}`)
          });
        }
      }
    }
    
    res.json({ count: processedCount, sample: sampleResults });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process data' });
  }
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

function getUserDetailsOptimized(userId) {
  return {
    preferences: { theme: 'dark', language: 'en', notifications: true },
    history: generateUserHistoryOptimized(),
    recommendations: generateRecommendationsOptimized()
  };
}

const crypto = require('crypto');
function generateHashOptimized(data) {
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 8);
}

function generateUserHistoryOptimized() {
  return Array.from({ length: 10 }, (_, i) => ({
    action: `action_${i}`,
    timestamp: new Date(Date.now() - i * 86400000)
  }));
}

function generateRecommendationsOptimized() {
  return Array.from({ length: 5 }, (_, i) => ({
    id: i,
    title: `Recommendation ${i}`,
    score: Math.random()
  }));
}

app.listen(PORT, () => {
  console.log(`Optimized server running on port ${PORT}`);
});

module.exports = app;
