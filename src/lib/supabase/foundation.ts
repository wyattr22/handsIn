// Opt in only after the People schema and email-verification gates have been provisioned.
export function peopleFoundationReady(){
  return process.env.NEXT_PUBLIC_LOCAL_AUTH==='true'||process.env.HANDSIN_PEOPLE_FOUNDATION==='ready';
}
