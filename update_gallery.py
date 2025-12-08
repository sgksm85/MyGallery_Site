import dropbox
import json
import os
import datetime

# --- CONFIGURATION ---
APP_KEY = 'cki8trhajbxsbb7'
APP_SECRET = 'q7bl6jdq1fizlx6'
DROPBOX_TARGET_DIR = '/保管/Shigi-memo/MyGallery_Assets'  # Dropbox path to assets
OUTPUT_JSON_PATH = 'docs/data.json'
TOKEN_FILE = '.creds.json'

def get_dbx_client():
    """Handles authentication and token storage."""
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, 'r') as f:
            creds = json.load(f)
            # Check if we have a refresh token (best practice) or access token
            return dropbox.Dropbox(
                app_key=APP_KEY,
                app_secret=APP_SECRET,
                oauth2_refresh_token=creds.get('refresh_token')
            )
    
    # First time auth flow
    auth_flow = dropbox.DropboxOAuth2FlowNoRedirect(
        APP_KEY, APP_SECRET, token_access_type='offline'
    )
    authorize_url = auth_flow.start()
    
    print("1. Go to: " + authorize_url)
    print("2. Click 'Allow' (you might need to log in).")
    print("3. Copy the authorization code.")
    auth_code = input("Enter the authorization code here: ").strip()

    try:
        oauth_result = auth_flow.finish(auth_code)
        
        # Save tokens
        with open(TOKEN_FILE, 'w') as f:
            json.dump({
                'access_token': oauth_result.access_token,
                'refresh_token': oauth_result.refresh_token,
                'account_id': oauth_result.account_id
            }, f)
        
        print("Success! detailed stored in .creds.json (keep this safe).")
        return dropbox.Dropbox(
            app_key=APP_KEY,
            app_secret=APP_SECRET,
            oauth2_refresh_token=oauth_result.refresh_token
        )
    except Exception as e:
        print(f"Error: {e}")
        exit(1)

def main():
    print("Connecting to Dropbox...")
    dbx = get_dbx_client()

    print(f"Listing files in {DROPBOX_TARGET_DIR}...")
    
    gallery_items = []
    
    try:
        # List files in the folder (recursive=True to get subfolders if any)
        result = dbx.files_list_folder(DROPBOX_TARGET_DIR, recursive=True)
        files = result.entries

        while result.has_more:
            result = dbx.files_list_folder_continue(result.cursor)
            files.extend(result.entries)

        file_count = 0
        for entry in files:
            # Skip folders and non-relevant files
            if not isinstance(entry, dropbox.files.FileMetadata):
                continue
            if entry.name.startswith('.'):
                continue

            print(f"Processing: {entry.name}")

            # Get or create shared link
            # Note: Dropbox API allows creating a Shared Link for a file if one doesn't exist.
            # If one exists, it might throw an error or we need to list shared links.
            # Strategy: List shared links first, if none, create one.
            
            link_metadata = None
            links_result = dbx.sharing_list_shared_links(path=entry.path_lower, direct_only=True)
            
            if links_result.links:
                link_metadata = links_result.links[0]
            else:
                try:
                    # Create new link
                    link_metadata = dbx.sharing_create_shared_link_with_settings(entry.path_lower)
                except dropbox.exceptions.ApiError as e:
                    print(f"  Warning: Could not get link for {entry.name} - {e}")
                    continue

            # Transform URL to direct download / view
            # Standard link: https://www.dropbox.com/s/xyz/file.pdf?dl=0
            # New SCL link:  https://www.dropbox.com/scl/fi/...?rlkey=...&dl=0
            # raw=1 tells Dropbox to serve the file content directly (inline if possible)
            raw_url = link_metadata.url
            
            # Simple replace is safer than splitting, to preserve rlkey
            if 'dl=0' in raw_url:
                direct_url = raw_url.replace('dl=0', 'raw=1')
            else:
                # If no dl params, append it
                if '?' in raw_url:
                    direct_url = raw_url + '&raw=1'
                else:
                    direct_url = raw_url + '?raw=1'

            # Determine type
            ext = entry.name.split('.')[-1].lower()
            file_type = 'file'
            if ext in ['pdf']:
                file_type = 'pdf'
            elif ext in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
                file_type = 'image'
            elif ext in ['html', 'htm']:
                file_type = 'html'

            # --- THUMBNAIL GENERATION ---
            thumb_url = ""
            if file_type in ['pdf', 'image']:
                try:
                    thumb_filename = f"{entry.content_hash}.jpg"
                    thumb_local_path = os.path.join('docs/thumbs', thumb_filename)
                    
                    # Create thumbs directory if not exists
                    if not os.path.exists('docs/thumbs'):
                        os.makedirs('docs/thumbs')

                    # Download thumbnail only if it doesn't exist
                    if not os.path.exists(thumb_local_path):
                        metadata, res = dbx.files_get_thumbnail(entry.path_lower, format=dropbox.files.ThumbnailFormat.jpeg, size=dropbox.files.ThumbnailSize.w640h480)
                        with open(thumb_local_path, "wb") as f:
                            f.write(res.content)
                        print(f"  [Thumbnail Created] {thumb_filename}")
                    
                    thumb_url = f"thumbs/{thumb_filename}"
                except dropbox.exceptions.ApiError as e:
                    print(f"  [Thumb Fail] {e}")

            # Format Updated Date
            updated_str = entry.client_modified.strftime('%Y-%m-%d')

            gallery_items.append({
                "title": entry.name,
                "type": file_type,
                "url": direct_url,
                "thumbnail": thumb_url, 
                "updated": updated_str
            })
            file_count += 1

        # Write to JSON
        with open(OUTPUT_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(gallery_items, f, indent=2, ensure_ascii=False)

        print(f"\nDone! Processed {file_count} files.")
        print(f"Updated {OUTPUT_JSON_PATH}")

    except dropbox.exceptions.ApiError as e:
        print(f"Dropbox API Error: {e}")
        # Hint for common error: path not found
        if "path/not_found" in str(e):
             print(f"Error: The folder '{DROPBOX_TARGET_DIR}' was not found in your Dropbox.")
             print("Please check the path exactly matches your Dropbox structure.")

if __name__ == "__main__":
    main()
