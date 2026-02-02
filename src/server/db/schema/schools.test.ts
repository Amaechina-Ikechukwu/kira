import { describe, it, expect } from 'vitest';
import { 
  SchoolSettings, 
  ClassSchedule,
  SchoolRole,
  MembershipStatus,
  EnrollmentStatus,
  SchoolType,
  SchoolPlan,
} from './schools';

describe('Schools Schema Types', () => {
  describe('SchoolSettings', () => {
    it('should have valid structure', () => {
      const settings: SchoolSettings = {
        allowSelfEnrollment: false,
        requireParentApproval: true,
        gradingSystem: 'percentage',
        academicYear: '2025-2026',
        defaultLanguage: 'en',
      };

      expect(settings.allowSelfEnrollment).toBe(false);
      expect(settings.requireParentApproval).toBe(true);
      expect(['percentage', 'letter', 'gpa']).toContain(settings.gradingSystem);
    });

    it('should support all grading systems', () => {
      const systems: SchoolSettings['gradingSystem'][] = ['percentage', 'letter', 'gpa'];
      
      systems.forEach(system => {
        const settings: SchoolSettings = {
          allowSelfEnrollment: true,
          requireParentApproval: false,
          gradingSystem: system,
          academicYear: '2025-2026',
          defaultLanguage: 'en',
        };
        expect(settings.gradingSystem).toBe(system);
      });
    });
  });

  describe('ClassSchedule', () => {
    it('should have valid structure', () => {
      const schedule: ClassSchedule = {
        days: ['monday', 'wednesday', 'friday'],
        startTime: '09:00',
        endTime: '10:30',
        timezone: 'America/New_York',
      };

      expect(schedule.days).toHaveLength(3);
      expect(schedule.startTime).toMatch(/^\d{2}:\d{2}$/);
      expect(schedule.endTime).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should support all weekdays', () => {
      const schedule: ClassSchedule = {
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        startTime: '08:00',
        endTime: '09:00',
        timezone: 'UTC',
      };

      expect(schedule.days).toHaveLength(7);
    });
  });

  describe('Role Types', () => {
    it('should have correct school roles', () => {
      const roles: SchoolRole[] = [
        'principal',
        'vice_principal',
        'dept_head',
        'teacher',
        'teaching_assistant',
        'student',
      ];

      expect(roles).toHaveLength(6);
      roles.forEach(role => {
        expect(typeof role).toBe('string');
      });
    });

    it('should have correct membership statuses', () => {
      const statuses: MembershipStatus[] = [
        'pending',
        'active',
        'suspended',
        'graduated',
      ];

      expect(statuses).toHaveLength(4);
    });

    it('should have correct enrollment statuses', () => {
      const statuses: EnrollmentStatus[] = [
        'enrolled',
        'completed',
        'dropped',
      ];

      expect(statuses).toHaveLength(3);
    });

    it('should have correct school types', () => {
      const types: SchoolType[] = [
        'school',
        'learning_center',
        'academy',
        'university',
        'training_center',
      ];

      expect(types).toHaveLength(5);
    });

    it('should have correct school plans', () => {
      const plans: SchoolPlan[] = [
        'free',
        'pro',
        'enterprise',
      ];

      expect(plans).toHaveLength(3);
    });
  });
});

describe('Schools Schema Validation', () => {
  describe('Slug Generation', () => {
    it('should generate URL-friendly slugs', () => {
      // Test helper function (implementation in routes)
      const generateSlug = (name: string): string => {
        return name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          + '-' + 'abcd1234'; // mock random suffix
      };

      expect(generateSlug('Springfield High School')).toBe('springfield-high-school-abcd1234');
      expect(generateSlug("St. Mary's Academy")).toBe('st-mary-s-academy-abcd1234');
      expect(generateSlug('Tech & Design Institute')).toBe('tech-design-institute-abcd1234');
    });
  });

  describe('Default Values', () => {
    it('should have sensible defaults for school settings', () => {
      const defaultSettings: SchoolSettings = {
        allowSelfEnrollment: false,
        requireParentApproval: true,
        gradingSystem: 'percentage',
        academicYear: '2025-2026',
        defaultLanguage: 'en',
      };

      // Self-enrollment should be off by default for security
      expect(defaultSettings.allowSelfEnrollment).toBe(false);
      // Parent approval protects minors
      expect(defaultSettings.requireParentApproval).toBe(true);
    });
  });
});
