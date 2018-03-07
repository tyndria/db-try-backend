export const permissions = {
	CAN_VIEW_STATISTICS: 'canViewStatistics',
	CAN_MANAGE_PROJECTS: 'canManageProjects',
	CAN_MANAGE_SCHEMAS: 'canManageSchemas',
	CAN_MANAGE_USERS: 'canManageUsers'
};

export const client = [permissions.CAN_VIEW_STATISTICS];
export const developer = [...client, permissions.CAN_MANAGE_PROJECTS, permissions.CAN_MANAGE_SCHEMAS];
export const lead = [...developer, permissions.CAN_MANAGE_USERS]; // temporarily it's not needed

export default {
	client,
	developer,
	lead
};

