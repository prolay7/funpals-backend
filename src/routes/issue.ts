import express from 'express';
import { 
    createIssue,
    toggleVisibility,
    deleteIssue,
    updateIssue,
    getIssuesBelongsToUser,
    getUserOwnIssues,
    getIssuesBelongsToCategory,
    changeStatusOfIssue,
    getAllIssues
} from '../controlers/issue';
import { authenticate } from '../controlers/auth';

const issueRouter = express.Router();

//get all issues
issueRouter.get('/', authenticate, getAllIssues);

// Create a new issue
issueRouter.post('/', authenticate, createIssue);

// Toggle issue visibility
issueRouter.patch('/:id/visibility', authenticate, toggleVisibility);

// Delete an issue
issueRouter.delete('/:id', authenticate, deleteIssue);

// Update an issue
issueRouter.put('/:id', authenticate, updateIssue);

//Change status
issueRouter.patch('/:id/status', authenticate, changeStatusOfIssue);

// Get issues belonging to a specific user
issueRouter.get('/user/:id', authenticate, getIssuesBelongsToUser);

// Get current user's own issues
issueRouter.get('/my-issues', authenticate, getUserOwnIssues);

// Get issues by category
issueRouter.get('/category/:id', authenticate, getIssuesBelongsToCategory);

export default issueRouter;