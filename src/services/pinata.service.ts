import axios from 'axios';

const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_KEY = import.meta.env.VITE_PINATA_SECRET_KEY;

// Function to upload metadata to IPFS via Pinata
export const pinJSONToIPFS = async (jsonData: any): Promise<string> => {
  try {
    const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
    
    const response = await axios.post(
      url,
      jsonData,
      {
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_KEY
        }
      }
    );
    
    // Return the IPFS CID (Content Identifier)
    return response.data.IpfsHash;
  } catch (error) {
    console.error('Error pinning to IPFS:', error);
    throw new Error('Failed to upload metadata to IPFS');
  }
};

// Function to upload image to IPFS via Pinata
export const pinFileToIPFS = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
    
    const response = await axios.post(
      url,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_KEY
        }
      }
    );
    
    // Return the IPFS CID
    return response.data.IpfsHash;
  } catch (error) {
    console.error('Error pinning file to IPFS:', error);
    throw new Error('Failed to upload file to IPFS');
  }
};

// Function to get metadata from IPFS
export const getFromIPFS = async (cid: string): Promise<any> => {
  try {
    const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching from IPFS:', error);
    throw new Error('Failed to fetch data from IPFS');
  }
};