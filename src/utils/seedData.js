const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Profile = require('../models/Profile');

// Sample data
const sampleUsers = [
  {
    email: 'john.doe@example.com',
    password: 'password123',
    name: 'John Doe',
    bio: 'Full-stack developer with 5+ years of experience in modern web technologies.',
    education: 'Bachelor of Computer Science, MIT',
    location: 'San Francisco, CA',
    skills: ['JavaScript', 'React', 'Node.js', 'Python', 'MongoDB', 'AWS'],
    projects: [
      {
        title: 'E-commerce Platform',
        description: 'A full-stack e-commerce platform built with React, Node.js, and MongoDB. Features include user authentication, product management, shopping cart, and payment integration.',
        links: ['https://github.com/johndoe/ecommerce', 'https://ecommerce-demo.com'],
        technologies: ['React', 'Node.js', 'MongoDB', 'Stripe', 'Redux'],
        imageUrl: 'https://via.placeholder.com/400x300/4F46E5/FFFFFF?text=E-commerce+Platform',
        isPublic: true
      },
      {
        title: 'Task Management App',
        description: 'A collaborative task management application with real-time updates, team collaboration, and progress tracking.',
        links: ['https://github.com/johndoe/taskmanager'],
        technologies: ['React', 'Socket.io', 'Express.js', 'PostgreSQL'],
        imageUrl: 'https://via.placeholder.com/400x300/10B981/FFFFFF?text=Task+Manager',
        isPublic: true
      }
    ],
    work: [
      {
        company: 'TechCorp Inc.',
        position: 'Senior Full-Stack Developer',
        duration: '2021 - Present',
        description: 'Leading development of enterprise web applications and mentoring junior developers.',
        startDate: new Date('2021-01-01'),
        isCurrent: true
      },
      {
        company: 'StartupXYZ',
        position: 'Full-Stack Developer',
        duration: '2019 - 2021',
        description: 'Built and maintained multiple web applications using modern JavaScript frameworks.',
        startDate: new Date('2019-06-01'),
        endDate: new Date('2021-01-01'),
        isCurrent: false
      }
    ],
    links: {
      github: 'https://github.com/johndoe',
      linkedin: 'https://linkedin.com/in/johndoe',
      portfolio: 'https://johndoe.dev',
      website: 'https://johndoe.dev'
    },
    avatar: 'https://via.placeholder.com/150x150/4F46E5/FFFFFF?text=JD'
  },
  {
    email: 'sarah.smith@example.com',
    password: 'password123',
    name: 'Sarah Smith',
    bio: 'Frontend developer passionate about creating beautiful and accessible user experiences.',
    education: 'Master of Design, Stanford University',
    location: 'New York, NY',
    skills: ['React', 'Vue.js', 'TypeScript', 'CSS', 'SASS', 'Figma', 'Accessibility'],
    projects: [
      {
        title: 'Design System Library',
        description: 'A comprehensive design system built with React and Storybook, featuring reusable components and design tokens.',
        links: ['https://github.com/sarahsmith/design-system'],
        technologies: ['React', 'Storybook', 'TypeScript', 'Styled Components'],
        imageUrl: 'https://via.placeholder.com/400x300/8B5CF6/FFFFFF?text=Design+System',
        isPublic: true
      },
      {
        title: 'Portfolio Website',
        description: 'A modern, responsive portfolio website showcasing creative work and projects.',
        links: ['https://github.com/sarahsmith/portfolio', 'https://sarahsmith.design'],
        technologies: ['Vue.js', 'CSS Grid', 'GSAP', 'Netlify'],
        imageUrl: 'https://via.placeholder.com/400x300/F59E0B/FFFFFF?text=Portfolio',
        isPublic: true
      }
    ],
    work: [
      {
        company: 'Design Studio Pro',
        position: 'Senior Frontend Developer',
        duration: '2020 - Present',
        description: 'Leading frontend development for client projects and maintaining design systems.',
        startDate: new Date('2020-03-01'),
        isCurrent: true
      }
    ],
    links: {
      github: 'https://github.com/sarahsmith',
      linkedin: 'https://linkedin.com/in/sarahsmith',
      portfolio: 'https://sarahsmith.design',
      website: 'https://sarahsmith.design'
    },
    avatar: 'https://via.placeholder.com/150x150/8B5CF6/FFFFFF?text=SS'
  },
  {
    email: 'mike.chen@example.com',
    password: 'password123',
    name: 'Mike Chen',
    bio: 'Backend developer specializing in scalable systems and cloud architecture.',
    education: 'Bachelor of Engineering, UC Berkeley',
    location: 'Seattle, WA',
    skills: ['Python', 'Django', 'FastAPI', 'Docker', 'Kubernetes', 'AWS', 'PostgreSQL'],
    projects: [
      {
        title: 'Microservices API',
        description: 'A scalable microservices architecture built with FastAPI, Docker, and Kubernetes for handling high-traffic applications.',
        links: ['https://github.com/mikechen/microservices-api'],
        technologies: ['FastAPI', 'Docker', 'Kubernetes', 'Redis', 'PostgreSQL'],
        imageUrl: 'https://via.placeholder.com/400x300/EF4444/FFFFFF?text=Microservices',
        isPublic: true
      },
      {
        title: 'Data Analytics Dashboard',
        description: 'Real-time data analytics dashboard with interactive charts and data visualization.',
        links: ['https://github.com/mikechen/analytics-dashboard'],
        technologies: ['Python', 'Django', 'Celery', 'Redis', 'Chart.js'],
        imageUrl: 'https://via.placeholder.com/400x300/06B6D4/FFFFFF?text=Analytics',
        isPublic: true
      }
    ],
    work: [
      {
        company: 'CloudTech Solutions',
        position: 'Backend Engineer',
        duration: '2021 - Present',
        description: 'Developing and maintaining cloud-native applications and microservices.',
        startDate: new Date('2021-08-01'),
        isCurrent: true
      }
    ],
    links: {
      github: 'https://github.com/mikechen',
      linkedin: 'https://linkedin.com/in/mikechen',
      portfolio: 'https://mikechen.dev',
      website: 'https://mikechen.dev'
    },
    avatar: 'https://via.placeholder.com/150x150/EF4444/FFFFFF?text=MC'
  }
];

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/predusk');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Clear existing data
const clearData = async () => {
  try {
    await User.deleteMany({});
    await Profile.deleteMany({});
    console.log('🗑️  Cleared existing data');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
  }
};

// Seed users and profiles
const seedData = async () => {
  try {
    console.log('🌱 Starting to seed data...');

    for (const userData of sampleUsers) {
      // Create user
      const user = new User({
        email: userData.email,
        password: userData.password
      });
      await user.save();

      // Create profile
      const profile = new Profile({
        userId: user._id,
        name: userData.name,
        email: userData.email,
        bio: userData.bio,
        education: userData.education,
        location: userData.location,
        skills: userData.skills,
        projects: userData.projects,
        work: userData.work,
        links: userData.links,
        avatar: userData.avatar,
        isPublic: true
      });
      await profile.save();

      console.log(`✅ Created user and profile for ${userData.name}`);
    }

    console.log('🎉 Data seeding completed successfully!');
    console.log(`📊 Created ${sampleUsers.length} users with profiles`);
    
    // Display sample data
    console.log('\n📋 Sample data created:');
    sampleUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   Skills: ${user.skills.join(', ')}`);
      console.log(`   Projects: ${user.projects.length}`);
      console.log(`   Work Experience: ${user.work.length} positions`);
    });

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await clearData();
    await seedData();
    
    console.log('\n🚀 You can now test the API with:');
    console.log('   - Login: POST /api/auth/login');
    console.log('   - Get profiles: GET /api/profile');
    console.log('   - Get projects: GET /api/projects');
    console.log('   - Search: GET /api/search?q=react');
    console.log('   - Health check: GET /health');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { seedData, clearData };
