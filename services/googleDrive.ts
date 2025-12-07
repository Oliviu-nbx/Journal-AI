
// Service for Google Drive Integration

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const FOLDER_NAME = 'ReflectAI_Data';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

export const initGoogleDrive = (clientId: string, apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const checkGapi = () => {
       if((window as any).gapi) {
          (window as any).gapi.load('client', async () => {
            try {
              await (window as any).gapi.client.init({
                apiKey: apiKey,
                discoveryDocs: [DISCOVERY_DOC],
              });
              gapiInited = true;
              checkInit();
            } catch (e) {
              reject(e);
            }
          });
       } else {
         setTimeout(checkGapi, 100);
       }
    }

    const checkGis = () => {
      if((window as any).google) {
        tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: '', // defined later
        });
        gisInited = true;
        checkInit();
      } else {
        setTimeout(checkGis, 100);
      }
    }

    const checkInit = () => {
      if (gapiInited && gisInited) resolve();
    }

    checkGapi();
    checkGis();
  });
};

export const signInToDrive = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    tokenClient.callback = async (resp: any) => {
      if (resp.error) {
        reject(resp);
      }
      resolve();
    };
    if ((window as any).gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
      tokenClient.requestAccessToken({prompt: ''});
    }
  });
};

export const signOutFromDrive = () => {
  const token = (window as any).gapi.client.getToken();
  if (token !== null) {
    (window as any).google.accounts.oauth2.revoke(token.access_token);
    (window as any).gapi.client.setToken('');
  }
};

const findOrCreateFolder = async (): Promise<string> => {
  const query = `mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`;
  const response = await (window as any).gapi.client.drive.files.list({
    q: query,
    fields: 'files(id, name)',
  });
  
  const files = response.result.files;
  if (files && files.length > 0) {
    return files[0].id;
  } else {
    const folderMetadata = {
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    };
    const folder = await (window as any).gapi.client.drive.files.create({
      resource: folderMetadata,
      fields: 'id',
    });
    return folder.result.id;
  }
};

export const syncDataToDrive = async (data: any) => {
  try {
    const folderId = await findOrCreateFolder();
    
    // Check if data.json exists
    const query = `name='data.json' and '${folderId}' in parents and trashed=false`;
    const listResponse = await (window as any).gapi.client.drive.files.list({
       q: query,
       fields: 'files(id)'
    });
    
    const fileContent = JSON.stringify(data, null, 2);
    const file = new Blob([fileContent], {type: 'application/json'});
    const metadata = {
      name: 'data.json',
      mimeType: 'application/json',
      parents: [folderId]
    };

    const accessToken = (window as any).gapi.client.getToken().access_token;
    
    if (listResponse.result.files.length > 0) {
       // Update
       const fileId = listResponse.result.files[0].id;
       await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
         method: 'PATCH',
         headers: new Headers({ 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' }),
         body: fileContent
       });
    } else {
       // Create
       const form = new FormData();
       form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
       form.append('file', file);
       
       await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
         method: 'POST',
         headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
         body: form
       });
    }
    return true;
  } catch (e) {
    console.error("Drive Sync Error", e);
    throw e;
  }
};

export const uploadAudioToDrive = async (id: string, audioBlob: Blob) => {
    try {
        const folderId = await findOrCreateFolder();
        const filename = `${id}.webm`;

        // Check existence
        const query = `name='${filename}' and '${folderId}' in parents and trashed=false`;
        const listResponse = await (window as any).gapi.client.drive.files.list({
            q: query,
            fields: 'files(id)'
        });

        if (listResponse.result.files.length > 0) {
            console.log("Audio already exists on drive");
            return;
        }

        const metadata = {
            name: filename,
            parents: [folderId]
        };
        
        const accessToken = (window as any).gapi.client.getToken().access_token;
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', audioBlob);

        await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
            body: form
        });

    } catch (e) {
        console.error("Audio Upload Error", e);
    }
};