import { Octokit } from '@octokit/rest';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

async function createRepository() {
  try {
    const octokit = await getUncachableGitHubClient();
    
    // Get authenticated user info
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`Authenticated as: ${user.login}`);
    
    // Check if repo already exists
    try {
      const { data: existingRepo } = await octokit.repos.get({
        owner: user.login,
        repo: 'WarehouseVision'
      });
      console.log(`Repository already exists: ${existingRepo.html_url}`);
      console.log(`Clone URL: ${existingRepo.clone_url}`);
      return existingRepo;
    } catch (e: any) {
      if (e.status !== 404) {
        throw e;
      }
    }
    
    // Create the repository
    const { data: repo } = await octokit.repos.createForAuthenticatedUser({
      name: 'WarehouseVision',
      description: 'AI-Powered Warehouse Inventory Management System - Uses vision AI to detect and count inventory items from warehouse images',
      private: false,
      auto_init: false
    });
    
    console.log(`Repository created successfully!`);
    console.log(`URL: ${repo.html_url}`);
    console.log(`Clone URL: ${repo.clone_url}`);
    console.log(`\nTo push your code, run:`);
    console.log(`  git remote add origin ${repo.clone_url}`);
    console.log(`  git push -u origin main`);
    
    return repo;
  } catch (error) {
    console.error('Error creating repository:', error);
    throw error;
  }
}

createRepository();
