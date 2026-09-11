import { previewPost } from '../../../../../src/lib/business-preview';
export const runtime = 'nodejs';
export const POST = (request: Request) => previewPost(request, 'exchange');
