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
    // Seed database with default Indian users for all 3 roles
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('sharma123', salt);
    const seedUsers = [
      {
        id: 'user_client_001',
        name: 'Rajesh Sharma',
        email: 'rajesh@infrasphere.in',
        password: hashedPassword,
        phone: '9876543210',
        role: 'Client',
        avatar: '',
        companyName: 'Sharma Infrastructure Private Limited',
        gstin: '09AABC1234M1Z2',
        address: 'Sector 62, Noida, Gautam Buddha Nagar, Uttar Pradesh, 201301',
        bio: 'Principal Infrastructure Contractor specializing in highway and utility cabling projects.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'user_seller_002',
        name: 'Amit Kumar',
        email: 'amit@infrasphere.in',
        password: hashedPassword,
        phone: '9876543211',
        role: 'Seller',
        avatar: '',
        companyName: 'Kumar Steel & Building Supplies',
        gstin: '09AABC3680M1Z2',
        address: 'Depot 4, Okhla Phase 2, Industrial Area, New Delhi, 110020',
        bio: 'Authorized regional distributor for Tata Tiscon, UltraTech, and industrial land holdings.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'user_consultant_003',
        name: 'Dr. Sanjay Rao',
        email: 'sanjay@infrasphere.in',
        password: hashedPassword,
        phone: '9876543212',
        role: 'Consultant',
        avatar: '',
        companyName: 'Rao Structural & Seismic Engineering',
        gstin: '09AABC3740M1Z2',
        address: 'IIT Bombay Research Park, Powai, Mumbai, 400076',
        bio: 'IIT Bombay Alumnus • 22 Yrs Exp • High-rise RCC Frames and Seismological Audits.',
        createdAt: new Date().toISOString()
      }
    ];
    fs.writeFileSync(DB_FILE, JSON.stringify(seedUsers, null, 2));
    return seedUsers;
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(data);
    return parsed.map(u => ({
      ...u,
      role: u.role || 'Client',
      avatar: u.avatar || '',
      phone: u.phone || '',
      bio: u.bio || ''
    }));
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
  const { name, email, password, phone, role } = req.body;

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

  const validRoles = ['Client', 'Seller', 'Consultant'];
  const selectedRole = validRoles.includes(role) ? role : 'Client';

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

  // Default contractor/supplier data seed
  const newUser = {
    id: 'user_' + Date.now() + Math.random().toString(36).substr(2, 5),
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    phone: phone.trim(),
    role: selectedRole,
    avatar: '',
    companyName: name.trim() + (selectedRole === 'Seller' ? ' Supplies & Logistics' : selectedRole === 'Consultant' ? ' Design & Engineering' : ' Enterprises'),
    gstin: '09AABC' + Math.floor(1000 + Math.random() * 9000) + 'M1Z2',
    address: 'Regional Address, India',
    bio: selectedRole === 'Seller' ? 'Authorized Indian building materials supplier & industrial land broker.' : selectedRole === 'Consultant' ? 'Senior civil & structural engineering consultant.' : 'Principal Infrastructure Contractor.',
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
      role: newUser.role,
      avatar: newUser.avatar,
      companyName: newUser.companyName,
      gstin: newUser.gstin,
      address: newUser.address,
      bio: newUser.bio
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
      role: user.role || 'Client',
      avatar: user.avatar || '',
      companyName: user.companyName,
      gstin: user.gstin,
      address: user.address,
      bio: user.bio || ''
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
      role: user.role || 'Client',
      avatar: user.avatar || '',
      companyName: user.companyName,
      gstin: user.gstin,
      address: user.address,
      bio: user.bio || ''
    }
  });
});

// 4. Update Profile Settings
app.post('/api/profile/update', authenticateToken, (req, res) => {
  const { name, phone, role, avatar, companyName, gstin, address, bio } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const users = readUsers();
  const userIndex = users.findIndex(u => u.id === req.userId);

  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const validRoles = ['Client', 'Seller', 'Consultant'];

  // Update details
  users[userIndex].name = name.trim();
  if (phone !== undefined) users[userIndex].phone = phone.trim();
  if (role && validRoles.includes(role)) users[userIndex].role = role;
  if (avatar !== undefined) users[userIndex].avatar = avatar;
  if (companyName !== undefined) users[userIndex].companyName = companyName.trim();
  if (gstin !== undefined) users[userIndex].gstin = gstin.trim();
  if (address !== undefined) users[userIndex].address = address.trim();
  if (bio !== undefined) users[userIndex].bio = bio.trim();

  writeUsers(users);

  res.json({
    message: 'Profile updated successfully',
    user: {
      id: users[userIndex].id,
      name: users[userIndex].name,
      email: users[userIndex].email,
      phone: users[userIndex].phone || '',
      role: users[userIndex].role || 'Client',
      avatar: users[userIndex].avatar || '',
      companyName: users[userIndex].companyName,
      gstin: users[userIndex].gstin,
      address: users[userIndex].address,
      bio: users[userIndex].bio || ''
    }
  });
});

// --- Projects Database Management ---
const PROJECTS_FILE = path.join(__dirname, 'projects.json');

function readProjects() {
  if (!fs.existsSync(PROJECTS_FILE)) {
    const seedProjects = [
      {
        id: 'proj_' + Date.now() + '_001',
        userId: 'user_client_001',
        fullName: 'Rajesh Sharma',
        phone: '9876543210',
        projectType: 'Home Construction',
        customProjectType: '',
        budget: '₹45,00,000',
        location: 'Sector 62, Noida, UP',
        description: 'Construction of G+2 duplex residential building with RCC structural frame.',
        status: 'In Progress',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
      },
      {
        id: 'proj_' + (Date.now() + 1) + '_002',
        userId: 'user_client_001',
        fullName: 'Rajesh Sharma',
        phone: '9876543210',
        projectType: 'Interior Design',
        customProjectType: '',
        budget: '₹12,50,000',
        location: 'Indirapuram, Ghaziabad',
        description: 'Commercial studio turnkey interior woodwork, acoustic panelling & false ceiling.',
        status: 'Pending',
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(seedProjects, null, 2));
    return seedProjects;
  }
  try {
    const data = fs.readFileSync(PROJECTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading projects database:', error);
    return [];
  }
}

function writeProjects(projects) {
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
}

// Initialize projects database
readProjects();

// 4. Create Project (Start Project Form Submission - Client Only)
app.post('/api/projects', authenticateToken, (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.id === req.userId);
  const userRole = (user && user.role ? user.role : '').toLowerCase();

  // Role Protection: Only CLIENT users can submit projects
  if (userRole !== 'client') {
    return res.status(403).json({ error: 'Only clients can create projects' });
  }

  const { fullName, phone, projectType, customProjectType, budget, location, description } = req.body;

  // Validate required fields
  if (!fullName || !fullName.trim()) {
    return res.status(400).json({ error: 'Please enter your Full Name' });
  }
  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: 'Please enter your Phone Number' });
  }
  if (!projectType || !projectType.trim()) {
    return res.status(400).json({ error: 'Please select a Project Type' });
  }
  if (projectType === 'Others' && (!customProjectType || !customProjectType.trim())) {
    return res.status(400).json({ error: 'Please specify your custom project type' });
  }
  if (!budget || !budget.trim()) {
    return res.status(400).json({ error: 'Please specify your Budget' });
  }
  if (!location || !location.trim()) {
    return res.status(400).json({ error: 'Please specify your Project Location' });
  }

  const projects = readProjects();
  const formattedBudget = budget.trim().startsWith('₹') ? budget.trim() : `₹${budget.trim()}`;
  const finalType = projectType === 'Others' ? (customProjectType.trim() || 'Others') : projectType.trim();

  const newProject = {
    id: 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    userId: req.userId,
    fullName: fullName.trim(),
    phone: phone.trim(),
    projectType: finalType,
    rawCategory: projectType.trim(),
    customProjectType: customProjectType ? customProjectType.trim() : '',
    budget: formattedBudget,
    location: location.trim(),
    description: description ? description.trim() : '',
    status: 'Pending',
    createdAt: new Date().toISOString()
  };

  projects.unshift(newProject);
  writeProjects(projects);

  res.status(201).json({
    message: 'Project submitted successfully 🚀',
    project: newProject
  });
});

// 5. Get Logged-in User's Projects (Client Role Only)
app.get('/api/projects', authenticateToken, (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.id === req.userId);
  const userRole = (user && user.role ? user.role : '').toLowerCase();

  if (userRole !== 'client') {
    return res.json({ projects: [] });
  }

  const projects = readProjects();
  // Return only logged-in user's projects
  const userProjects = projects.filter(p => p.userId === req.userId);
  res.json({
    projects: userProjects
  });
});

// Default Route
app.get('/', (req, res) => {
  res.send('Infrasphere Authentication & Projects API is running.');
});

app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});
