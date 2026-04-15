import type { Instrumentation } from 'next';

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const { logError } = await import('@/lib/error-logger');
  const digest = (error as { digest?: string }).digest;
  await logError(error, {
    digest,
    url: `${request.method} ${request.path}`,
    context: `${context.routerKind} | ${context.routeType} | ${context.routePath}`,
  });
};
