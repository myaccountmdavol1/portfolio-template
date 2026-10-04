import { moderationRoutes } from '@/lib/auth/moderation';

const routes = moderationRoutes('inbox');
export const GET = routes.GET;
export const POST = routes.POST;
export const DELETE = routes.DELETE;
