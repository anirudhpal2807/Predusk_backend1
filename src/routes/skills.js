const express = require('express');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { optionalAuth } = require('../middleware/auth');
const Profile = require('../models/Profile');

const router = express.Router();

/**
 * @route   GET /api/skills
 * @desc    Get all skills with counts
 * @access  Public
 */
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const { limit = 50, page = 1 } = req.query;

  // Aggregate skills from all public profiles
  const skillsAggregation = await Profile.aggregate([
    { $match: { isPublic: true } },
    { $unwind: '$skills' },
    {
      $group: {
        _id: { $toLower: '$skills' },
        count: { $sum: 1 },
        profiles: { $addToSet: '$userId' }
      }
    },
    { $sort: { count: -1, _id: 1 } },
    { $skip: (parseInt(page) - 1) * parseInt(limit) },
    { $limit: parseInt(limit) }
  ]);

  // Get total count for pagination
  const totalSkills = await Profile.aggregate([
    { $match: { isPublic: true } },
    { $unwind: '$skills' },
    { $group: { _id: { $toLower: '$skills' } } },
    { $count: 'total' }
  ]);

  const totalCount = totalSkills[0]?.total || 0;
  const totalPages = Math.ceil(totalCount / parseInt(limit));

  // Format response
  const skills = skillsAggregation.map(skill => ({
    name: skill._id,
    count: skill.count,
    profileCount: skill.profiles.length
  }));

  res.json({
    success: true,
    data: {
      skills,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalSkills: totalCount,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    }
  });
}));

/**
 * @route   GET /api/skills/top
 * @desc    Get top skills by popularity
 * @access  Public
 */
router.get('/top', optionalAuth, asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  // Get top skills by count
  const topSkills = await Profile.aggregate([
    { $match: { isPublic: true } },
    { $unwind: '$skills' },
    {
      $group: {
        _id: { $toLower: '$skills' },
        count: { $sum: 1 },
        profiles: { $addToSet: '$userId' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: parseInt(limit) }
  ]);

  // Format response
  const skills = topSkills.map((skill, index) => ({
    rank: index + 1,
    name: skill._id,
    count: skill.count,
    profileCount: skill.profiles.length
  }));

  res.json({
    success: true,
    data: {
      skills,
      total: skills.length
    }
  });
}));

/**
 * @route   GET /api/skills/:skillName
 * @desc    Get detailed information about a specific skill
 * @access  Public
 */
router.get('/:skillName', optionalAuth, asyncHandler(async (req, res) => {
  const { skillName } = req.params;
  const { limit = 20, page = 1 } = req.query;

  // Find profiles with the specified skill
  const profilesWithSkill = await Profile.find({
    skills: { $in: [new RegExp(skillName, 'i')] },
    isPublic: true
  }).select('name avatar bio skills projects work location');

  if (profilesWithSkill.length === 0) {
    throw createError.notFound('No profiles found with this skill');
  }

  // Count total profiles with this skill
  const totalProfiles = await Profile.countDocuments({
    skills: { $in: [new RegExp(skillName, 'i')] },
    isPublic: true
  });

  // Get projects that use this skill
  const projectsWithSkill = [];
  profilesWithSkill.forEach(profile => {
    profile.projects.forEach(project => {
      if (project.isPublic && 
          project.technologies && 
          project.technologies.some(tech => 
            tech.toLowerCase().includes(skillName.toLowerCase())
          )) {
        projectsWithSkill.push({
          id: project._id,
          title: project.title,
          description: project.description,
          links: project.links,
          technologies: project.technologies,
          imageUrl: project.imageUrl,
          profile: {
            id: profile._id,
            name: profile.name,
            avatar: profile.avatar
          }
        });
      }
    });
  });

  // Pagination for profiles
  const totalPages = Math.ceil(totalProfiles / parseInt(limit));
  const startIndex = (parseInt(page) - 1) * parseInt(limit);
  const endIndex = startIndex + parseInt(limit);
  const paginatedProfiles = profilesWithSkill.slice(startIndex, endIndex);

  // Get related skills (skills that often appear together)
  const relatedSkills = await Profile.aggregate([
    { $match: { isPublic: true } },
    { $unwind: '$skills' },
    {
      $group: {
        _id: '$skills',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  res.json({
    success: true,
    data: {
      skill: {
        name: skillName,
        totalProfiles,
        totalProjects: projectsWithSkill.length
      },
      profiles: paginatedProfiles.map(profile => ({
        id: profile._id,
        userId: profile.userId,
        name: profile.name,
        avatar: profile.avatar,
        bio: profile.bio,
        skills: profile.skills,
        location: profile.location
      })),
      projects: projectsWithSkill.slice(0, 10), // Show top 10 projects
      relatedSkills: relatedSkills
        .filter(skill => skill._id.toLowerCase() !== skillName.toLowerCase())
        .slice(0, 5)
        .map(skill => ({
          name: skill._id,
          count: skill.count
        })),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProfiles,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    }
  });
}));

/**
 * @route   GET /api/skills/search/:query
 * @desc    Search skills by name
 * @access  Public
 */
router.get('/search/:query', optionalAuth, asyncHandler(async (req, res) => {
  const { query } = req.params;
  const { limit = 20 } = req.query;

  // Search skills that match the query
  const matchingSkills = await Profile.aggregate([
    { $match: { isPublic: true } },
    { $unwind: '$skills' },
    {
      $match: {
        skills: { $regex: query, $options: 'i' }
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
    { $limit: parseInt(limit) }
  ]);

  // Format response
  const skills = matchingSkills.map(skill => ({
    name: skill.originalName,
    count: skill.count
  }));

  res.json({
    success: true,
    data: {
      query,
      skills,
      total: skills.length
    }
  });
}));

/**
 * @route   GET /api/skills/categories
 * @desc    Get skills grouped by categories (basic categorization)
 * @access  Public
 */
router.get('/categories/categories', optionalAuth, asyncHandler(async (req, res) => {
  // Define basic skill categories
  const skillCategories = {
    'Programming Languages': ['javascript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'swift', 'kotlin', 'php', 'ruby', 'scala'],
    'Frontend': ['react', 'vue', 'angular', 'html', 'css', 'sass', 'less', 'typescript', 'jquery', 'bootstrap', 'tailwind'],
    'Backend': ['node.js', 'express', 'django', 'flask', 'spring', 'asp.net', 'laravel', 'rails', 'fastapi'],
    'Database': ['mongodb', 'mysql', 'postgresql', 'redis', 'sqlite', 'oracle', 'sql server', 'elasticsearch'],
    'DevOps': ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jenkins', 'gitlab', 'github actions', 'terraform'],
    'Mobile': ['react native', 'flutter', 'ios', 'android', 'xamarin', 'ionic'],
    'AI/ML': ['tensorflow', 'pytorch', 'scikit-learn', 'opencv', 'numpy', 'pandas', 'matplotlib'],
    'Tools': ['git', 'vscode', 'intellij', 'postman', 'figma', 'adobe', 'blender']
  };

  // Get skill counts for each category
  const categorizedSkills = {};

  for (const [category, skills] of Object.entries(skillCategories)) {
    const categorySkills = await Profile.aggregate([
      { $match: { isPublic: true } },
      { $unwind: '$skills' },
      {
        $match: {
          skills: { $in: skills.map(skill => new RegExp(skill, 'i')) }
        }
      },
      {
        $group: {
          _id: { $toLower: '$skills' },
          count: { $sum: 1 },
          originalName: { $first: '$skills' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    categorizedSkills[category] = categorySkills.map(skill => ({
      name: skill.originalName,
      count: skill.count
    }));
  }

  res.json({
    success: true,
    data: {
      categories: categorizedSkills
    }
  });
}));

module.exports = router;
