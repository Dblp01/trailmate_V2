exports.handler = async () => {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
      stravaClientId: process.env.STRAVA_CLIENT_ID || ''
    })
  };
};
