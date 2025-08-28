# trading


### .nojekyll file

By default, GitHub Pages uses a static site generator called Jekyll to build your site. Jekyll has a convention of ignoring any files or directories that begin with an underscore (_), as it considers them to be special "include" files that shouldn't be published directly.

Your shared header and navbar are located at /trading/assets/includes/_header.html and .../_navbar.html. Because both the _includes directory and the files themselves start with an underscore, Jekyll skips them. When your page's JavaScript tries to fetch them, the files don't exist on the server, resulting in a 404 error.

The Solution: Disable Jekyll
The simplest and most effective way to fix this is to tell GitHub Pages not to use Jekyll. You can do this by placing an empty file named `.nojekyll` in the root of the directory you are publishing from. This signals to GitHub Pages that you want to serve your files exactly as they are, without any processing.