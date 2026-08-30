const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'infrasphere_super_secret_key_2026';
const DB_FILE = path.join(__dirname, 'users.json');

app.use(cors());
app.use(express.json());

// Helper function to read users database
function readUsers() {
  if (!fs.existsSync(DB_FILE)) {
    // Seed database with default Indian contractor data
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('sharma123', salt);
    const seedUsers = [
      {
        id: 'user_' + Date.now(),
        name: 'Rajesh Sharma',
        email: 'rajesh@infrasphere.in',
        password: hashedPassword,
        phone: '9876543210',
        companyName: 'Sharma Infrastructure Private Limited',
        gstin: '09AABC1234M1Z2',
        address: 'Sector 62, Noida, Gautam Buddha Nagar, Uttar Pradesh, 201301',
        createdAt: new Date().toISOString()
      }
    ];
    fs.writeFileSync(DB_FILE, JSON.stringify(seedUsers, null, 2));
    return seedUsers;
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users database, resetting.', error);
    return [];
  }
}

// Helper function to write users database
function writeUsers(users) {
  fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
}

// Initialize database
readUsers();

// Middleware: Authenticate JWT Token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.userId = decoded.id;
    next();
  });
}

// --- API ROUTES ---

// 1. User Signup
app.post('/api/auth/signup', (req, res) => {
  const { name, email, password, phone } = req.body;

  // Basic Validation
  if (!name || !email || !password || !phone) {
    return res.status(400).json({ error: 'All fields (name, email, password, phone) are required' });
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address' });
  }

  // Password length validation
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  // Phone number format validation (exactly 10 digits)
  const phoneRegex = /^\d{10}$/;
  if (!phoneRegex.test(phone.trim())) {
    return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
  }

  const users = readUsers();
  const normalizedEmail = email.toLowerCase().trim();

  // Duplicate email check
  const userExists = users.some(u => u.email.toLowerCase() === normalizedEmail);
  if (userExists) {
    return res.status(400).json({ error: 'This email is already registered' });
  }

  // Password Hashing
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);

  // Default contractor data seed
  const newUser = {
    id: 'user_' + Date.now() + Math.random().toString(36).substr(2, 5),
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    phone: phone.trim(),
    companyName: name.trim() + ' Enterprises',
    gstin: '09AABC' + Math.floor(1000 + Math.random() * 9000) + 'M1Z2',
    address: 'Regional Address, India',
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeUsers(users);

  // Generate JWT Token
  const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: '7d' });

  // Return user info and token
  res.status(201).json({
    message: 'User created successfully',
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      companyName: newUser.companyName,
      gstin: newUser.gstin,
      address: newUser.address
    }
  });
});

// 2. User Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please enter both email and password' });
  }

  const users = readUsers();
  const normalizedEmail = email.toLowerCase().trim();

  // Find User
  const user = users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Verify Password
  const passwordMatch = bcrypt.compareSync(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Generate JWT Token
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      companyName: user.companyName,
      gstin: user.gstin,
      address: user.address
    }
  });
});

// 3. Get Authenticated User
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.id === req.userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      companyName: user.companyName,
      gstin: user.gstin,
      address: user.address
    }
  });
});

// 4. Update Profile Settings
app.post('/api/profile/update', authenticateToken, (req, res) => {
  const { name, companyName, gstin, address } = req.body;

  if (!name || !companyName || !gstin || !address) {
    return res.status(400).json({ error: 'All profile fields are required' });
  }

  const users = readUsers();
  const userIndex = users.findIndex(u => u.id === req.userId);

  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Update details
  users[userIndex].name = name.trim();
  users[userIndex].companyName = companyName.trim();
  users[userIndex].gstin = gstin.trim();
  users[userIndex].address = address.trim();

  writeUsers(users);

  res.json({
    message: 'Profile updated successfully',
    user: {
      id: users[userIndex].id,
      name: users[userIndex].name,
      email: users[userIndex].email,
      companyName: users[userIndex].companyName,
      gstin: users[userIndex].gstin,
      address: users[userIndex].address
    }
  });
});

// Default Route
app.get('/', (req, res) => {
  res.send('Infrasphere Authentication API is running.');
});

app.listen(PORT, () => {
  console.log(`Express auth server running on http://localhost:${PORT}`);
});
