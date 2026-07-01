import { Octokit } from '@octokit/rest';
import { slugify } from './export.js';

async function getFileSha(octokit, owner, repo, path) {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    if (!Array.isArray(data)) return data.sha;
  } catch {
    /* file does not exist */
  }
  return undefined;
}

export async function pushProjectToGitHub({ token, repoName, projectName, files, isPrivate = false }) {
  const octokit = new Octokit({ auth: token });

  const { data: user } = await octokit.users.getAuthenticated();
  const owner = user.login;
  const repo = slugify(repoName || projectName);

  try {
    await octokit.repos.createForAuthenticatedUser({
      name: repo,
      description: `${projectName} — built with DIGIGRO AI`,
      private: isPrivate,
      auto_init: false,
    });
  } catch (err) {
    if (err.status !== 422) throw err;
  }

  const pushed = [];
  for (const file of files) {
    const sha = await getFileSha(octokit, owner, repo, file.path);
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: file.path,
      message: sha ? `Update ${file.path}` : `Add ${file.path}`,
      content: Buffer.from(file.content, 'utf8').toString('base64'),
      sha,
    });
    pushed.push(file.path);
  }

  return {
    owner,
    repo,
    url: `https://github.com/${owner}/${repo}`,
    filesPushed: pushed.length,
  };
}
