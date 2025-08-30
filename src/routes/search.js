const express = require('express');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { optionalAuth } = require('../middleware/auth');
const Profile = require('../models/Profile');

const router = express.Router();

/**
 * @route   GET /api/search
 * @desc    Search across profiles, projects, and skills
 * @access  Public
 */
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const { q: query, type, limit = 20, page = 1 } = req.query;

  if (!query || query.trim().length === 0) {
    throw createError.badRequest('Search query is required');
  }

  const searchQuery = query.trim();
  const searchType = type || 'all'; // all, profiles, projects, skills
  const pageLimit = parseInt(limit);
  const currentPage = parseInt(page);

  let results = {};

  // Search profiles
  if (searchType === 'all' || searchType === 'profiles') {
    const profiles = await Profile.find({
      $and: [
        { isPublic: true },
        {
          $or: [
            { name: { $regex: searchQuery, $options: 'i' } },
            { bio: { $regex: searchQuery, $options: 'i' } },
            { education: { $regex: searchQuery, $options: 'i' } },
            { location: { $regex: searchQuery, $options: 'i' } }
          ]
        }
      ]
    })
    .select('userId name avatar bio skills education location')
    .limit(pageLimit)
    .skip((currentPage - 1) * pageLimit)
    .sort({ name: 1 });

    const totalProfiles = await Profile.countDocuments({
      $and: [
        { isPublic: true },
        {
          $or: [
            { name: { $regex: searchQuery, $options: 'i' } },
            { bio: { $regex: searchQuery, $options: 'i' } },
            { education: { $regex: searchQuery, $options: 'i' } },
            { location: { $regex: searchQuery, $options: 'i' } }
          ]
        }
      ]
    });

    results.profiles = {
      data: profiles.map(profile => ({
        id: profile._id,
        userId: profile.userId,
        name: profile.name,
        avatar: profile.avatar,
        bio: profile.bio,
        skills: profile.skills,
        education: profile.education,
        location: profile.location
      })),
      total: totalProfiles,
      totalPages: Math.ceil(totalProfiles / pageLimit),
      currentPage,
      hasNextPage: currentPage < Math.ceil(totalProfiles / pageLimit),
      hasPrevPage: currentPage > 1
    };
  }

  // Search projects
  if (searchType === 'all' || searchType === 'projects') {
    const profilesWithProjects = await Profile.find({
      $and: [
        { isPublic: true },
        {
          $or: [
            { 'projects.title': { $regex: searchQuery, $options: 'i' } },
            { 'projects.description': { $regex: searchQuery, $options: 'i' } },
            { 'projects.technologies': { $in: [new RegExp(searchQuery, 'i')] } }
          ]
        }
      ]
    })
    .select('userId name avatar projects skills')
    .limit(pageLimit)
    .skip((currentPage - 1) * pageLimit);

    const projects = [];
    profilesWithProjects.forEach(profile => {
      profile.projects.forEach(project => {
        if (project.isPublic && 
            (project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
             project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
             (project.technologies && project.technologies.some(tech => 
               tech.toLowerCase().includes(searchQuery.toLowerCase())
             )))) {
          projects.push({
            id: project._id,
            title: project.title,
            description: project.description,
            links: project.links,
            technologies: project.technologies,
            imageUrl: project.imageUrl,
            profile: {
              id: profile._id,
              userId: profile.userId,
              name: profile.name,
              avatar: profile.avatar
            }
          });
        }
      });
    });

    // Get total count for pagination
    const totalProjects = await Profile.aggregate([
      { $match: { isPublic: true } },
      { $unwind: '$projects' },
      {
        $match: {
          $and: [
            { 'projects.isPublic': true },
            {
              $or: [
                { 'projects.title': { $regex: searchQuery, $options: 'i' } },
                { 'projects.description': { $regex: searchQuery, $options: 'i' } },
                { 'projects.technologies': { $in: [new RegExp(searchQuery, 'i')] } }
              ]
            }
          ]
        }
      },
      { $count: 'total' }
    ]);

    const totalProjectsCount = totalProjects[0]?.total || 0;

    results.projects = {
      data: projects,
      total: totalProjectsCount,
      totalPages: Math.ceil(totalProjectsCount / pageLimit),
      currentPage,
      hasNextPage: currentPage < Math.ceil(totalProjectsCount / pageLimit),
      hasPrevPage: currentPage > 1
    };
  }

  // Search skills
  if (searchType === 'all' || searchType === 'skills') {
    const matchingSkills = await Profile.aggregate([
      { $match: { isPublic: true } },
      { $unwind: '$skills' },
      {
        $match: {
          skills: { $regex: searchQuery, $options: 'i' }
        }
      },
      {
        $group: {
          _id: { $toLower: '$skills' },
          count: { $sum: 1 },
          originalName: { $first: '$skills' }
        }
      },
      { $sort: { count: -1, originalName: 1 } },
      { $skip: (currentPage - 1) * pageLimit },
      { $limit: pageLimit }
    ]);

    const totalSkills = await Profile.aggregate([
      { $match: { isPublic: true } },
      { $unwind: '$skills' },
      {
        $match: {
          skills: { $regex: searchQuery, $options: 'i' }
        }
      },
      { $group: { _id: { $toLower: '$skills' } } },
      { $count: 'total' }
    ]);

    const totalSkillsCount = totalSkills[0]?.total || 0;

    results.skills = {
      data: matchingSkills.map(skill => ({
        name: skill.originalName,
        count: skill.count
      })),
      total: totalSkillsCount,
      totalPages: Math.ceil(totalSkillsCount / pageLimit),
      currentPage,
      hasNextPage: currentPage < Math.ceil(totalSkillsCount / pageLimit),
      hasPrevPage: currentPage > 1
    };
  }

  // Calculate overall search statistics
  const totalResults = Object.values(results).reduce((sum, result) => sum + result.total, 0);

  res.json({
    success: true,
    data: {
      query: searchQuery,
      type: searchType,
      totalResults,
      results,
      pagination: {
        currentPage,
        limit: pageLimit
      }
    }
  });
}));

/**
 * @route   GET /api/search/suggestions
 * @desc    Get search suggestions based on partial query
 * @access  Public
 */
router.get('/suggestions', optionalAuth, asyncHandler(async (req, res) => {
  const { q: query, limit = 10 } = req.query;

  if (!query || query.trim().length === 0) {
    return res.json({
      success: true,
      data: {
        suggestions: []
      }
    });
  }

  const searchQuery = query.trim();
  const suggestions = [];

  // Get profile name suggestions
  const profileSuggestions = await Profile.find({
    name: { $regex: `^${searchQuery}`, $options: 'i' },
    isPublic: true
  })
  .select('name')
  .limit(5);

  profileSuggestions.forEach(profile => {
    suggestions.push({
      type: 'profile',
      text: profile.name,
      value: profile.name
    });
  });

  // Get skill suggestions
  const skillSuggestions = await Profile.aggregate([
    { $match: { isPublic: true } },
    { $unwind: '$skills' },
    {
      $match: {
        skills: { $regex: `^${searchQuery}`, $options: 'i' }
      }
    },
    {
      $group: {
        _id: { $toLower: '$skills' },
        originalName: { $first: '$skills' }
      }
    },
    { $limit: 5 }
  ]);

  skillSuggestions.forEach(skill => {
    suggestions.push({
      type: 'skill',
      text: skill.originalName,
      value: skill.originalName
    });
  });

  // Get project title suggestions
  const projectSuggestions = await Profile.aggregate([
    { $match: { isPublic: true } },
    { $unwind: '$projects' },
    {
      $match: {
        $and: [
          { 'projects.isPublic': true },
          { 'projects.title': { $regex: `^${searchQuery}`, $options: 'i' } }
        ]
      }
    },
    {
      $group: {
        _id: '$projects.title',
        title: { $first: '$projects.title' }
      }
    },
    { $limit: 5 }
  ]);

  projectSuggestions.forEach(project => {
    suggestions.push({
      type: 'project',
      text: project.title,
      value: project.title
    });
  });

  // Remove duplicates and limit results
  const uniqueSuggestions = suggestions
    .filter((suggestion, index, self) => 
      index === self.findIndex(s => s.value === suggestion.value)
    )
    .slice(0, parseInt(limit));

  res.json({
    success: true,
    data: {
      query: searchQuery,
      suggestions: uniqueSuggestions
    }
  });
}));

/**
 * @route   GET /api/search/advanced
 * @desc    Advanced search with multiple filters
 * @access  Public
 */
router.get('/advanced', optionalAuth, asyncHandler(async (req, res) => {
  const { 
    q: query, 
    skills, 
    location, 
    education,
    projectTech,
    limit = 20, 
    page = 1 
  } = req.query;

  // Build advanced search query
  let searchQuery = { isPublic: true };

  // Text search
  if (query && query.trim().length > 0) {
    searchQuery.$or = [
      { name: { $regex: query.trim(), $options: 'i' } },
      { bio: { $regex: query.trim(), $options: 'i' } },
      { 'projects.title': { $regex: query.trim(), $options: 'i' } },
      { 'projects.description': { $regex: query.trim(), $options: 'i' } }
    ];
  }

  // Skills filter
  if (skills) {
    const skillsArray = skills.split(',').map(skill => skill.trim());
    searchQuery.skills = { $in: skillsArray.map(skill => new RegExp(skill, 'i')) };
  }

  // Location filter
  if (location) {
    searchQuery.location = { $regex: location, $options: 'i' };
  }

  // Education filter
  if (education) {
    searchQuery.education = { $regex: education, $options: 'i' };
  }

  // Project technology filter
  if (projectTech) {
    const techArray = projectTech.split(',').map(tech => tech.trim());
    searchQuery['projects.technologies'] = { $in: techArray.map(tech => new RegExp(tech, 'i')) };
  }

  const profiles = await Profile.find(searchQuery)
    .select('userId name avatar bio skills education location projects work')
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .sort({ name: 1 });

  const totalProfiles = await Profile.countDocuments(searchQuery);

  res.json({
    success: true,
    data: {
      query: {
        text: query || '',
        skills: skills ? skills.split(',') : [],
        location: location || '',
        education: education || '',
        projectTech: projectTech ? projectTech.split(',') : []
      },
      profiles: profiles.map(profile => ({
        id: profile._id,
        userId: profile.userId,
        name: profile.name,
        avatar: profile.avatar,
        bio: profile.bio,
        skills: profile.skills,
        education: profile.education,
        location: profile.location,
        projects: profile.projects.filter(p => p.isPublic).slice(0, 3),
        work: profile.work.slice(0, 2)
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalProfiles / parseInt(limit)),
        totalProfiles,
        hasNextPage: parseInt(page) < Math.ceil(totalProfiles / parseInt(limit)),
        hasPrevPage: parseInt(page) > 1
      }
    }
  });
}));

/**
 * @route   GET /api/search/trending-skills
 * @desc    Get trending skills based on frequency
 * @access  Public
 */
router.get('/trending-skills', optionalAuth, asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const pageLimit = parseInt(limit);

  try {
    const trendingSkills = await Profile.aggregate([
      { $match: { isPublic: true } },
      { $unwind: '$skills' },
      {
        $group: {
          _id: { $toLower: '$skills' },
          count: { $sum: 1 },
          originalName: { $first: '$skills' }
        }
      },
      { $sort: { count: -1, originalName: 1 } },
      { $limit: pageLimit }
    ]);

    res.json({
      success: true,
      data: {
        skills: trendingSkills.map(skill => ({
          name: skill.originalName,
          count: skill.count
        }))
      }
    });
  } catch (error) {
    console.error('Failed to get trending skills:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trending skills'
    });
  }
}));

module.exports = router;
