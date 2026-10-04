import { moderationRoutes } from '@/lib/auth/moderation';

const routes = moderationRoutes('guestbook');
export const GET = routes.GET;
export const POST = routes.POST;
export const DELETE = routes.DELETE;
