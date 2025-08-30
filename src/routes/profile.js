const express = require('express');
const Joi = require('joi');
const path = require('path');
const fs = require('fs');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const Profile = require('../models/Profile');
const upload = require('../middleware/upload');

const router = express.Router();

// Validation schemas
const profileUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(100).messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 100 characters'
  }),
  email: Joi.string().email().messages({
    'string.email': 'Please provide a valid email address'
  }),
  bio: Joi.string().max(500).messages({
    'string.max': 'Bio cannot exceed 500 characters'
  }),
  education: Joi.string().max(200).messages({
    'string.max': 'Education cannot exceed 200 characters'
  }),
  location: Joi.string().max(100).messages({
    'string.max': 'Location cannot exceed 100 characters'
  }),
  avatar: Joi.string().uri().messages({
    'string.uri': 'Avatar must be a valid URL'
  }),
  isPublic: Joi.boolean()
});

const skillSchema = Joi.object({
  skill: Joi.string().min(1).max(50).required().messages({
    'string.min': 'Skill name cannot be empty',
    'string.max': 'Skill name cannot exceed 50 characters',
    'any.required': 'Skill name is required'
  })
});

const projectSchema = Joi.object({
  title: Joi.string().min(1).max(100).required().messages({
    'string.min': 'Project title cannot be empty',
    'string.max': 'Project title cannot exceed 100 characters',
    'any.required': 'Project title is required'
  }),
  description: Joi.string().min(1).max(1000).required().messages({
    'string.min': 'Project description cannot be empty',
    'string.max': 'Project description cannot exceed 1000 characters',
    'any.required': 'Project description is required'
  }),
  links: Joi.array().items(Joi.string().uri()).messages({
    'string.uri': 'Project links must be valid URLs'
  }),
  technologies: Joi.array().items(Joi.string().max(50)).messages({
    'string.max': 'Technology names cannot exceed 50 characters'
  }),
  imageUrl: Joi.string().allow('').messages({
    'string.base': 'Project image must be a string'
  }),
  isPublic: Joi.boolean()
});

const workExperienceSchema = Joi.object({
  company: Joi.string().min(1).max(100).required().messages({
    'string.min': 'Company name cannot be empty',
    'string.max': 'Company name cannot exceed 100 characters',
    'any.required': 'Company name is required'
  }),
  position: Joi.string().min(1).max(100).required().messages({
    'string.min': 'Position cannot be empty',
    'string.max': 'Position cannot exceed 100 characters',
    'any.required': 'Position is required'
  }),
  description: Joi.string().min(1).max(500).required().messages({
    'string.min': 'Work description cannot be empty',
    'string.max': 'Work description cannot exceed 500 characters',
    'any.required': 'Work description is required'
  }),
  startDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    'string.pattern.base': 'Start date must be in YYYY-MM-DD format',
    'any.required': 'Start date is required'
  }),
  endDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow('').messages({
    'string.pattern.base': 'End date must be in YYYY-MM-DD format'
  }),
  isCurrent: Joi.boolean(),
  location: Joi.string().max(100).allow('')
});

const linksSchema = Joi.object({
  github: Joi.string().pattern(/^https?:\/\/.+/).allow('').messages({
    'string.pattern.base': 'GitHub link must be a valid URL starting with http:// or https://'
  }),
  linkedin: Joi.string().pattern(/^https?:\/\/.+/).allow('').messages({
    'string.pattern.base': 'LinkedIn link must be a valid URL starting with http:// or https://'
  }),
  portfolio: Joi.string().pattern(/^https?:\/\/.+/).allow('').messages({
    'string.pattern.base': 'Portfolio link must be a valid URL starting with http:// or https://'
  }),
  website: Joi.string().pattern(/^https?:\/\/.+/).allow('').messages({
    'string.pattern.base': 'Website link must be a valid URL starting with http:// or https://'
  })
});

/**
 * @route   GET /api/profile
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const profile = await Profile.findOne({ userId: req.user._id });
  
  if (!profile) {
    throw createError.notFound('Profile not found');
  }

  res.json({
    success: true,
    data: profile
  });
}));

/**
 * @route   POST /api/profile
 * @desc    Create or update current user's profile
 * @access  Private
 */
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  // Validate request body
  const { error, value } = profileUpdateSchema.validate(req.body);
  if (error) {
    throw createError.badRequest(error.details[0].message);
  }

  let profile = await Profile.findOne({ userId: req.user._id });
  
  if (profile) {
    // Update existing profile
    Object.assign(profile, value);
    await profile.save();
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: profile
    });
  } else {
    // Create new profile
    profile = new Profile({
      userId: req.user._id,
      ...value
    });
    
    await profile.save();
    
    res.status(201).json({
      success: true,
      message: 'Profile created successfully',
      data: profile
    });
  }
}));

/**
 * @route   PUT /api/profile
 * @desc    Update current user's profile
 * @access  Private
 */
router.put('/', authenticateToken, asyncHandler(async (req, res) => {
  // Validate request body
  const { error, value } = profileUpdateSchema.validate(req.body);
  if (error) {
    throw createError.badRequest(error.details[0].message);
  }

  const profile = await Profile.findOne({ userId: req.user._id });
  
  if (!profile) {
    throw createError.notFound('Profile not found');
  }

  Object.assign(profile, value);
  await profile.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: profile
  });
}));

/**
 * @route   POST /api/profile/skills
 * @desc    Add a skill to profile
 * @access  Private
 */
router.post('/skills', authenticateToken, asyncHandler(async (req, res) => {
  const { error, value } = skillSchema.validate(req.body);
  if (error) {
    throw createError.badRequest(error.details[0].message);
  }

  const profile = await Profile.findOne({ userId: req.user._id });
  
  if (!profile) {
    throw createError.notFound('Profile not found');
  }

  await profile.addSkill(value.skill);

  res.json({
    success: true,
    message: 'Skill added successfully',
    data: profile.skills
  });
}));

/**
 * @route   DELETE /api/profile/skills/:skill
 * @desc    Remove a skill from profile
 * @access  Private
 */
router.delete('/skills/:skill', authenticateToken, asyncHandler(async (req, res) => {
  const profile = await Profile.findOne({ userId: req.user._id });
  
  if (!profile) {
    throw createError.notFound('Profile not found');
  }

  await profile.removeSkill(req.params.skill);

  res.json({
    success: true,
    message: 'Skill removed successfully',
    data: profile.skills
  });
}));

/**
 * @route   POST /api/profile/projects
 * @desc    Add a project to profile
 * @access  Private
 */
router.post('/projects', authenticateToken, asyncHandler(async (req, res) => {
  const { error, value } = projectSchema.validate(req.body);
  if (error) {
    throw createError.badRequest(error.details[0].message);
  }

  const profile = await Profile.findOne({ userId: req.user._id });
  
  if (!profile) {
    throw createError.notFound('Profile not found');
  }

  await profile.addProject(value);

  res.json({
    success: true,
    message: 'Project added successfully',
    data: profile.projects
  });
}));

/**
 * @route   POST /api/profile/projects/upload
 * @desc    Add a project to profile with image upload
 * @access  Private
 */
router.post('/projects/upload', authenticateToken, upload.single('image'), asyncHandler(async (req, res) => {
  try {
    console.log('📁 File upload request received:', req.file);
    console.log('📝 Request body:', req.body);
    
    // Validate project data
    const projectData = { ...req.body };
    
    // Convert arrays from form data
    if (req.body.technologies) {
      projectData.technologies = Array.isArray(req.body.technologies) 
        ? req.body.technologies 
        : [req.body.technologies];
    }
    
    if (req.body.links) {
      projectData.links = Array.isArray(req.body.links) 
        ? req.body.links.filter(link => link.trim()) 
        : [req.body.links].filter(link => link.trim());
    }
    
    // If image was uploaded, add the file path
    if (req.file) {
      projectData.imageUrl = `/uploads/projects/${req.file.filename}`;
      console.log('🖼️ Image uploaded, path:', projectData.imageUrl);
      console.log('🖼️ Full file path:', req.file.path);
      console.log('🖼️ File exists check:', require('fs').existsSync(req.file.path));
      console.log('🖼️ File size:', req.file.size);
      console.log('🖼️ File mimetype:', req.file.mimetype);
      console.log('🖼️ Original filename:', req.file.originalname);
      console.log('🖼️ Generated filename:', req.file.filename);
    }
    
    console.log('🔍 Final project data:', projectData);
    
    const { error, value } = projectSchema.validate(projectData);
    if (error) {
      console.error('❌ Validation error:', error.details[0].message);
      // If validation fails and file was uploaded, remove it
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      throw createError.badRequest(error.details[0].message);
    }

    const profile = await Profile.findOne({ userId: req.user._id });
    
    if (!profile) {
      console.error('❌ Profile not found for user:', req.user._id);
      // If validation fails and file was uploaded, remove it
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      throw createError.notFound('Profile not found');
    }

    console.log('✅ Profile found, adding project...');
    await profile.addProject(value);

    res.json({
      success: true,
      message: 'Project added successfully with image',
      data: profile.projects
    });
  } catch (error) {
    console.error('❌ Error in project upload:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    
    // If any error occurs and file was uploaded, remove it
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Uploaded file cleaned up due to error');
      } catch (cleanupError) {
        console.error('❌ Failed to cleanup uploaded file:', cleanupError.message);
      }
    }
    throw error;
  }
}));

/**
 * @route   PUT /api/profile/projects/:projectId
 * @desc    Update a project in profile
 * @access  Private
 */
router.put('/projects/:projectId', authenticateToken, asyncHandler(async (req, res) => {
  const { error, value } = projectSchema.validate(req.body);
  if (error) {
    throw createError.badRequest(error.details[0].message);
  }

  const profile = await Profile.findOne({ userId: req.user._id });
  
  if (!profile) {
    throw createError.notFound('Profile not found');
  }

  await profile.updateProject(req.params.projectId, value);

  res.json({
    success: true,
    message: 'Project updated successfully',
    data: profile.projects
  });
}));

/**
 * @route   DELETE /api/profile/projects/:projectId
 * @desc    Remove a project from profile
 * @access  Private
 */
router.delete('/projects/:projectId', authenticateToken, asyncHandler(async (req, res) => {
  const profile = await Profile.findOne({ userId: req.user._id });
  
  if (!profile) {
    throw createError.notFound('Profile not found');
  }

  await profile.removeProject(req.params.projectId);

  res.json({
    success: true,
    message: 'Project removed successfully',
    data: profile.projects
  });
}));

/**
 * @route   POST /api/profile/work
 * @desc    Add work experience to profile
 * @access  Private
 */
router.post('/work', authenticateToken, asyncHandler(async (req, res) => {
  console.log('💼 Work experience request received:', req.body);
  
  const { error, value } = workExperienceSchema.validate(req.body);
  if (error) {
    console.error('❌ Work experience validation error:', error.details[0].message);
    console.error('❌ Validation details:', error.details);
    console.error('❌ Request body:', req.body);
    throw createError.badRequest(error.details[0].message);
  }

  console.log('✅ Work experience validation passed:', value);

  const profile = await Profile.findOne({ userId: req.user._id });
  
  if (!profile) {
    throw createError.notFound('Profile not found');
  }

  profile.work.push(value);
  await profile.save();

  console.log('✅ Work experience added successfully:', value);

  res.json({
    success: true,
    message: 'Work experience added successfully',
    data: profile.work
  });
}));

/**
 * @route   PUT /api/profile/links
 * @desc    Update social links in profile
 * @access  Private
 */
router.put('/links', authenticateToken, asyncHandler(async (req, res) => {
  console.log('🔗 Links update request received:', req.body);
  
  const { error, value } = linksSchema.validate(req.body);
  if (error) {
    console.error('❌ Links validation error:', error.details[0].message);
    console.error('❌ Validation details:', error.details);
    console.error('❌ Request body:', req.body);
    throw createError.badRequest(error.details[0].message);
  }

  console.log('✅ Links validation passed:', value);

  const profile = await Profile.findOne({ userId: req.user._id });
  
  if (!profile) {
    throw createError.notFound('Profile not found');
  }

  profile.links = { ...profile.links, ...value };
  await profile.save();

  console.log('✅ Links updated successfully:', profile.links);

  res.json({
    success: true,
    message: 'Links updated successfully',
    data: profile.links
  });
}));

/**
 * @route   GET /api/profile/:userId
 * @desc    Get public profile by user ID
 * @access  Public
 */
router.get('/:userId', asyncHandler(async (req, res) => {
  // Validate userId format
  if (!req.params.userId || !/^[0-9a-fA-F]{24}$/.test(req.params.userId)) {
    throw createError.badRequest('Invalid user ID format');
  }

  const profile = await Profile.findOne({ 
    userId: req.params.userId,
    isPublic: true 
  });
  
  if (!profile) {
    throw createError.notFound('Profile not found or not public');
  }

  res.json({
    success: true,
    data: profile.getPublicProfile()
  });
}));

module.exports = router;
