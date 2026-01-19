// GitHub Integration using Replit Connector
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

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
export async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

// Get authenticated user info
export async function getAuthenticatedUser() {
  const octokit = await getUncachableGitHubClient();
  const { data } = await octokit.users.getAuthenticated();
  return data;
}

// List user's repositories
export async function listRepositories() {
  const octokit = await getUncachableGitHubClient();
  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: 100
  });
  return data;
}

// Push files to a repository (handles both empty and existing repos)
export async function pushToRepository(
  owner: string,
  repo: string,
  branch: string,
  files: Array<{ path: string; content: string }>,
  message: string
) {
  const octokit = await getUncachableGitHubClient();

  // Create blobs for each file first
  console.log(`Creating ${files.length} blobs...`);
  const blobs = await Promise.all(
    files.map(async (file) => {
      const { data: blob } = await octokit.git.createBlob({
        owner,
        repo,
        content: Buffer.from(file.content).toString('base64'),
        encoding: 'base64'
      });
      return { path: file.path, sha: blob.sha, mode: '100644' as const, type: 'blob' as const };
    })
  );
  console.log('Blobs created successfully');

  // Check if repo is empty or has existing commits
  let parentSha: string | null = null;
  let baseTreeSha: string | undefined = undefined;
  
  try {
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`
    });
    parentSha = refData.object.sha;
    
    // Get the tree from the current commit
    const { data: commit } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: parentSha
    });
    baseTreeSha = commit.tree.sha;
    console.log(`Found existing branch ${branch} at ${parentSha}`);
  } catch (error: any) {
    if (error.status === 404 || error.status === 409) {
      // Repository is empty or branch doesn't exist
      console.log('Repository is empty, creating initial commit...');
    } else {
      throw error;
    }
  }

  // Create a new tree
  const { data: tree } = await octokit.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree: blobs
  });
  console.log('Tree created');

  // Create a new commit (with or without parent)
  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo,
    message,
    tree: tree.sha,
    parents: parentSha ? [parentSha] : []
  });
  console.log('Commit created:', newCommit.sha);

  // Update or create the reference
  if (parentSha) {
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha
    });
  } else {
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha: newCommit.sha
    });
  }
  console.log(`Branch ${branch} updated`);

  return newCommit;
}
