import { z } from 'zod';
import type { Tool, ToolResult } from '../../types/tool.js';
import { logger } from '../../utils/logger.js';

const inputSchema = z.object({
  action: z.enum([
    'list_courses',
    'list_assignments',
    'get_assignment',
    'get_grades',
    'list_announcements',
  ]).describe('Action to perform'),
  course_id: z.string().optional().describe('Canvas course ID'),
  assignment_id: z.string().optional().describe('Canvas assignment ID'),
});

interface CanvasConfig {
  domain: string;
  accessToken: string;
}

// Canvas configuration - will be loaded from environment or config file
let canvasConfig: CanvasConfig | null = null;

export function setCanvasConfig(config: CanvasConfig): void {
  canvasConfig = config;
}

export function getCanvasConfig(): CanvasConfig | null {
  return canvasConfig;
}

class CanvasClient {
  constructor(
    private domain: string,
    private accessToken: string
  ) {}

  private async makeRequest(endpoint: string): Promise<any> {
    const url = `https://${this.domain}/api/v1${endpoint}`;
    
    logger.debug(`Canvas API request: ${url}`);

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Canvas API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error(error as Error, 'Canvas API request failed');
      throw error;
    }
  }

  async listCourses(): Promise<any[]> {
    return this.makeRequest('/courses?enrollment_state=active&per_page=100');
  }

  async listAssignments(courseId: string): Promise<any[]> {
    return this.makeRequest(`/courses/${courseId}/assignments?per_page=100`);
  }

  async getAssignment(courseId: string, assignmentId: string): Promise<any> {
    return this.makeRequest(`/courses/${courseId}/assignments/${assignmentId}`);
  }

  async getGrades(courseId: string): Promise<any> {
    return this.makeRequest(`/courses/${courseId}/enrollments?user_id=self&include[]=current_grade`);
  }

  async listAnnouncements(courseId: string): Promise<any[]> {
    return this.makeRequest(`/courses/${courseId}/discussion_topics?only_announcements=true&per_page=20`);
  }
}

function formatCourses(courses: any[]): string {
  if (courses.length === 0) {
    return 'No active courses found.';
  }

  let output = `Found ${courses.length} active course(s):\n\n`;
  
  courses.forEach((course, index) => {
    output += `${index + 1}. **${course.name}** (ID: ${course.id})\n`;
    if (course.course_code) {
      output += `   Code: ${course.course_code}\n`;
    }
    if (course.enrollment_term_id) {
      output += `   Term ID: ${course.enrollment_term_id}\n`;
    }
    output += '\n';
  });

  return output;
}

function formatAssignments(assignments: any[]): string {
  if (assignments.length === 0) {
    return 'No assignments found for this course.';
  }

  let output = `Found ${assignments.length} assignment(s):\n\n`;
  
  assignments.forEach((assignment, index) => {
    output += `${index + 1}. **${assignment.name}** (ID: ${assignment.id})\n`;
    
    if (assignment.due_at) {
      const dueDate = new Date(assignment.due_at);
      output += `   Due: ${dueDate.toLocaleString()}\n`;
    }
    
    if (assignment.points_possible) {
      output += `   Points: ${assignment.points_possible}\n`;
    }
    
    if (assignment.submission_types) {
      output += `   Submission Types: ${assignment.submission_types.join(', ')}\n`;
    }
    
    if (assignment.html_url) {
      output += `   URL: ${assignment.html_url}\n`;
    }
    
    output += '\n';
  });

  return output;
}

function formatAssignment(assignment: any): string {
  let output = `**${assignment.name}**\n\n`;
  
  if (assignment.description) {
    // Strip HTML tags for cleaner output
    const description = assignment.description.replace(/<[^>]*>/g, '').trim();
    output += `Description:\n${description}\n\n`;
  }
  
  if (assignment.due_at) {
    const dueDate = new Date(assignment.due_at);
    output += `Due Date: ${dueDate.toLocaleString()}\n`;
  }
  
  if (assignment.points_possible) {
    output += `Points Possible: ${assignment.points_possible}\n`;
  }
  
  if (assignment.submission_types) {
    output += `Submission Types: ${assignment.submission_types.join(', ')}\n`;
  }
  
  if (assignment.html_url) {
    output += `\nView in Canvas: ${assignment.html_url}\n`;
  }

  return output;
}

function formatGrades(enrollments: any[]): string {
  if (enrollments.length === 0) {
    return 'No grade information found.';
  }

  let output = 'Current Grades:\n\n';
  
  enrollments.forEach((enrollment) => {
    if (enrollment.grades) {
      const grade = enrollment.grades;
      output += `Current Grade: ${grade.current_grade || 'N/A'}\n`;
      output += `Current Score: ${grade.current_score !== undefined ? grade.current_score + '%' : 'N/A'}\n`;
      
      if (grade.final_grade) {
        output += `Final Grade: ${grade.final_grade}\n`;
      }
      if (grade.final_score !== undefined) {
        output += `Final Score: ${grade.final_score}%\n`;
      }
    }
  });

  return output;
}

function formatAnnouncements(announcements: any[]): string {
  if (announcements.length === 0) {
    return 'No announcements found for this course.';
  }

  let output = `Found ${announcements.length} announcement(s):\n\n`;
  
  announcements.forEach((announcement, index) => {
    output += `${index + 1}. **${announcement.title}**\n`;
    
    if (announcement.posted_at) {
      const postedDate = new Date(announcement.posted_at);
      output += `   Posted: ${postedDate.toLocaleString()}\n`;
    }
    
    if (announcement.message) {
      // Strip HTML tags and truncate
      const message = announcement.message.replace(/<[^>]*>/g, '').trim();
      const truncated = message.length > 200 ? message.substring(0, 200) + '...' : message;
      output += `   ${truncated}\n`;
    }
    
    if (announcement.html_url) {
      output += `   URL: ${announcement.html_url}\n`;
    }
    
    output += '\n';
  });

  return output;
}

async function execute(params: z.infer<typeof inputSchema>): Promise<ToolResult> {
  try {
    // Check if Canvas is configured
    if (!canvasConfig) {
      return {
        success: false,
        error: 'Canvas is not configured. Please set your Canvas domain and access token in the configuration.',
      };
    }

    const client = new CanvasClient(canvasConfig.domain, canvasConfig.accessToken);
    const { action, course_id, assignment_id } = params;

    logger.debug(`Executing Canvas action: ${action}`, { course_id, assignment_id });

    switch (action) {
      case 'list_courses': {
        const courses = await client.listCourses();
        return {
          success: true,
          output: formatCourses(courses),
        };
      }

      case 'list_assignments': {
        if (!course_id) {
          return {
            success: false,
            error: 'course_id is required for list_assignments action',
          };
        }
        const assignments = await client.listAssignments(course_id);
        return {
          success: true,
          output: formatAssignments(assignments),
        };
      }

      case 'get_assignment': {
        if (!course_id || !assignment_id) {
          return {
            success: false,
            error: 'course_id and assignment_id are required for get_assignment action',
          };
        }
        const assignment = await client.getAssignment(course_id, assignment_id);
        return {
          success: true,
          output: formatAssignment(assignment),
        };
      }

      case 'get_grades': {
        if (!course_id) {
          return {
            success: false,
            error: 'course_id is required for get_grades action',
          };
        }
        const enrollments = await client.getGrades(course_id);
        return {
          success: true,
          output: formatGrades(enrollments),
        };
      }

      case 'list_announcements': {
        if (!course_id) {
          return {
            success: false,
            error: 'course_id is required for list_announcements action',
          };
        }
        const announcements = await client.listAnnouncements(course_id);
        return {
          success: true,
          output: formatAnnouncements(announcements),
        };
      }

      default:
        return {
          success: false,
          error: `Unknown action: ${action}`,
        };
    }
  } catch (error: any) {
    logger.error(error, 'Canvas tool execution error');
    return {
      success: false,
      error: error.message || 'Unknown error during Canvas operation',
    };
  }
}

export const canvasTool: Tool = {
  name: 'canvas',
  description: `Interact with Canvas LMS to access course information, assignments, grades, and announcements. 
  
Available actions:
- list_courses: Get all active courses
- list_assignments: Get assignments for a course (requires course_id)
- get_assignment: Get detailed assignment information (requires course_id and assignment_id)
- get_grades: Get current grades for a course (requires course_id)
- list_announcements: Get recent announcements for a course (requires course_id)

Note: Canvas must be configured with domain and access token before use.`,
  inputSchema,
  execute,
};
