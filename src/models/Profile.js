const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true,
    maxlength: [100, 'Project title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Project description is required'],
    trim: true,
    maxlength: [1000, 'Project description cannot exceed 1000 characters']
  },
  links: [{
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Project links must be valid URLs'
    }
  }],
  technologies: [{
    type: String,
    trim: true
  }],
  imageUrl: {
    type: String,
    trim: true
  },
  isPublic: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const workExperienceSchema = new mongoose.Schema({
  company: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  position: {
    type: String,
    required: [true, 'Position is required'],
    trim: true,
    maxlength: [100, 'Position cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Work description is required'],
    trim: true,
    maxlength: [500, 'Work description cannot exceed 500 characters']
  },
  startDate: {
    type: String,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: String,
    default: ''
  },
  isCurrent: {
    type: Boolean,
    default: false
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  }
}, {
  timestamps: true
});

const profileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  education: {
    type: String,
    trim: true,
    maxlength: [200, 'Education cannot exceed 200 characters']
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  skills: [{
    type: String,
    trim: true,
    maxlength: [50, 'Skill name cannot exceed 50 characters']
  }],
  projects: [projectSchema],
  work: [workExperienceSchema],
  links: {
    github: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^https?:\/\/.+/i.test(v);
        },
        message: 'GitHub link must be a valid URL starting with http:// or https://'
      }
    },
    linkedin: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^https?:\/\/.+/i.test(v);
        },
        message: 'LinkedIn link must be a valid URL starting with http:// or https://'
      }
    },
    portfolio: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Portfolio link must be a valid URL'
      }
    },
    website: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Website link must be a valid URL'
      }
    }
  },
  avatar: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  isPublic: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for user relationship
profileSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Indexes for better query performance
profileSchema.index({ userId: 1 });
profileSchema.index({ name: 'text', bio: 'text', skills: 'text' });
profileSchema.index({ 'projects.title': 'text', 'projects.description': 'text' });
profileSchema.index({ isPublic: 1 });
profileSchema.index({ skills: 1 });

// Pre-save middleware to ensure email consistency
profileSchema.pre('save', function(next) {
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase();
  }
  next();
});

// Instance method to get public profile
profileSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    name: this.name,
    bio: this.bio,
    education: this.education,
    skills: this.skills,
    projects: this.projects.filter(p => p.isPublic),
    work: this.work,
    links: this.links,
    avatar: this.avatar,
    location: this.location,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Instance method to add skill
profileSchema.methods.addSkill = function(skill) {
  if (!this.skills.includes(skill)) {
    this.skills.push(skill);
  }
  return this.save();
};

// Instance method to remove skill
profileSchema.methods.removeSkill = function(skill) {
  this.skills = this.skills.filter(s => s !== skill);
  return this.save();
};

// Instance method to add project
profileSchema.methods.addProject = function(projectData) {
  this.projects.push(projectData);
  return this.save();
};

// Instance method to update project
profileSchema.methods.updateProject = function(projectId, projectData) {
  const projectIndex = this.projects.findIndex(p => p._id.toString() === projectId);
  if (projectIndex !== -1) {
    this.projects[projectIndex] = { ...this.projects[projectIndex].toObject(), ...projectData };
    return this.save();
  }
  throw new Error('Project not found');
};

// Instance method to remove project
profileSchema.methods.removeProject = function(projectId) {
  this.projects = this.projects.filter(p => p._id.toString() !== projectId);
  return this.save();
};

// Static method to find profiles by skill
profileSchema.statics.findBySkill = function(skill) {
  return this.find({ skills: skill, isPublic: true });
};

// Static method to search profiles
profileSchema.statics.search = function(query) {
  return this.find({
    $and: [
      { isPublic: true },
      {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { bio: { $regex: query, $options: 'i' } },
          { skills: { $in: [new RegExp(query, 'i')] } },
          { 'projects.title': { $regex: query, $options: 'i' } },
          { 'projects.description': { $regex: query, $options: 'i' } }
        ]
      }
    ]
  });
};

module.exports = mongoose.model('Profile', profileSchema);
