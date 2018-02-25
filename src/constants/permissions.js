export const client = ['canViewStatistics'];
export const developer = [...client, 'canManageProjects', 'canManageSchemas'];
export const lead = [...developer, 'canManageUsers']; // temporarily it's not needed