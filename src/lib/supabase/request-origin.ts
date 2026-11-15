export function allowedOrigin(request: Request) {
  const origin=request.headers.get('origin');
  const allowed=process.env.NEXT_PUBLIC_LOCAL_AUTH==='true'
    ? ['http://127.0.0.1:3000','http://localhost:3000',process.env.APP_ORIGIN].filter(Boolean)
    : [process.env.APP_ORIGIN,process.env.VERCEL_URL?'https://'+process.env.VERCEL_URL:undefined].filter(Boolean);
  return !!origin&&allowed.includes(origin);
}
