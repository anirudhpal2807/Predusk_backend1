const express = require('express');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const Profile = require('../models/Profile');

const router = express.Router();

/**
 * @route   GET /api/projects
 * @desc    Get all public projects with optional filtering
 * @access  Public
 */
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const { skill, search, limit = 20, page = 1 } = req.query;
  
  // Build query for public profiles with projects
  let query = { isPublic: true };
  
  // Filter by skill
  if (skill) {
    query.skills = { $in: [new RegExp(skill, 'i')] };
  }
  
  // Search in project titles and descriptions
  if (search) {
    query.$or = [
      { 'projects.title': { $regex: search, $options: 'i' } },
      { 'projects.description': { $regex: search, $options: 'i' } }
    ];
  }

  const profiles = await Profile.find(query)
    .select('name avatar projects skills')
    .populate('userId', 'email')
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .sort({ 'projects.createdAt': -1 });

  // Extract and format projects
  const allProjects = [];
  profiles.forEach(profile => {
    profile.projects.forEach(project => {
      if (project.isPublic) {
        allProjects.push({
          id: project._id,
          title: project.title,
          description: project.description,
          links: project.links,
          technologies: project.technologies,
          imageUrl: project.imageUrl,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          profile: {
            id: profile._id,
            name: profile.name,
            avatar: profile.avatar,
            skills: profile.skills
          }
        });
      }
    });
  });

  // Apply skill filtering to projects if specified
  let filteredProjects = allProjects;
  if (skill) {
    filteredProjects = allProjects.filter(project => 
      project.technologies && 
      project.technologies.some(tech => 
        tech.toLowerCase().includes(skill.toLowerCase())
      )
    );
  }

  // Pagination
  const totalProjects = filteredProjects.length;
  const totalPages = Math.ceil(totalProjects / parseInt(limit));
  const startIndex = (parseInt(page) - 1) * parseInt(limit);
  const endIndex = startIndex + parseInt(limit);
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: {
      projects: paginatedProjects,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProjects,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    }
  });
}));

/**
 * @route   GET /api/projects/:projectId
 * @desc    Get a specific project by ID
 * @access  Public
 */
router.get('/:projectId', optionalAuth, asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  
  const profile = await Profile.findOne({
    'projects._id': projectId,
    'projects.isPublic': true,
    isPublic: true
  }).select('name avatar projects skills bio');

  if (!profile) {
    throw createError.notFound('Project not found or not public');
  }

  const project = profile.projects.find(p => p._id.toString() === projectId);
  
  if (!project) {
    throw createError.notFound('Project not found');
  }

  res.json({
    success: true,
    data: {
      project: {
        id: project._id,
        title: project.title,
        description: project.description,
        links: project.links,
        technologies: project.technologies,
        imageUrl: project.imageUrl,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      },
      profile: {
        id: profile._id,
        name: profile.name,
        avatar: profile.avatar,
        skills: profile.skills,
        bio: profile.bio
      }
    }
  });
}));

/**
 * @route   GET /api/projects/skill/:skill
 * @desc    Get projects filtered by specific skill
 * @access  Public
 */
router.get('/skill/:skill', optionalAuth, asyncHandler(async (req, res) => {
  const { skill } = req.params;
  const { limit = 20, page = 1 } = req.query;

  // Find profiles with the specified skill
  const profiles = await Profile.find({
    skills: { $in: [new RegExp(skill, 'i')] },
    isPublic: true
  }).select('name avatar projects skills');

  // Extract projects that use the specified skill
  const projectsWithSkill = [];
  profiles.forEach(profile => {
    profile.projects.forEach(project => {
      if (project.isPublic && 
          project.technologies && 
          project.technologies.some(tech => 
            tech.toLowerCase().includes(skill.toLowerCase())
          )) {
        projectsWithSkill.push({
          id: project._id,
          title: project.title,
          description: project.description,
          links: project.links,
          technologies: project.technologies,
          imageUrl: project.imageUrl,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          profile: {
            id: profile._id,
            name: profile.name,
            avatar: profile.avatar,
            skills: profile.skills
          }
        });
      }
    });
  });

  // Sort by creation date (newest first)
  projectsWithSkill.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Pagination
  const totalProjects = projectsWithSkill.length;
  const totalPages = Math.ceil(totalProjects / parseInt(limit));
  const startIndex = (parseInt(page) - 1) * parseInt(limit);
  const endIndex = startIndex + parseInt(limit);
  const paginatedProjects = projectsWithSkill.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: {
      skill,
      projects: paginatedProjects,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProjects,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    }
  });
}));

/**
 * @route   GET /api/projects/user/:userId
 * @desc    Get all projects from a specific user
 * @access  Public
 */
router.get('/user/:userId', optionalAuth, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { limit = 20, page = 1 } = req.query;

  const profile = await Profile.findOne({
    userId,
    isPublic: true
  }).select('name avatar projects skills bio');

  if (!profile) {
    throw createError.notFound('User profile not found or not public');
  }

  // Filter public projects
  const publicProjects = profile.projects.filter(p => p.isPublic);

  // Pagination
  const totalProjects = publicProjects.length;
  const totalPages = Math.ceil(totalProjects / parseInt(limit));
  const startIndex = (parseInt(page) - 1) * parseInt(limit);
  const endIndex = startIndex + parseInt(limit);
  const paginatedProjects = publicProjects.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: {
      profile: {
        id: profile._id,
        name: profile.name,
        avatar: profile.avatar,
        skills: profile.skills,
        bio: profile.bio
      },
      projects: paginatedProjects,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProjects,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    }
  });
}));

/**
 * @route   GET /api/projects/trending
 * @desc    Get trending projects (most recent with engagement)
 * @access  Public
 */
router.get('/trending/trending', optionalAuth, asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  // Get recent public projects
  const profiles = await Profile.find({ isPublic: true })
    .select('name avatar projects skills')
    .sort({ 'projects.createdAt': -1 })
    .limit(parseInt(limit) * 2); // Get more profiles to have enough projects

  // Extract and sort projects by creation date
  const allProjects = [];
  profiles.forEach(profile => {
    profile.projects.forEach(project => {
      if (project.isPublic) {
        allProjects.push({
          id: project._id,
          title: project.title,
          description: project.description,
          links: project.links,
          technologies: project.technologies,
          imageUrl: project.imageUrl,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          profile: {
            id: profile._id,
            name: profile.name,
            avatar: profile.avatar,
            skills: profile.skills
          }
        });
      }
    });
  });

  // Sort by creation date and take the limit
  const trendingProjects = allProjects
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, parseInt(limit));

  res.json({
    success: true,
    data: {
      projects: trendingProjects
    }
  });
}));

module.exports = router;
