# File Upload Feature for Case Details

## Overview
Implement file upload functionality allowing advocates to upload case detail files that clients can view and download.

## Tasks
- [ ] Add case_files table to database
- [ ] Install multer for file uploads
- [ ] Add file upload endpoint in backend
- [ ] Add file download endpoint in backend
- [ ] Add file listing endpoint in backend
- [x] Update advocate dashboard to show file upload for cases
- [x] Update client dashboard to show downloadable case files
- [ ] Test file upload and download functionality

## Database Changes
- Add case_files table with fields: id, case_id, filename, original_name, file_path, uploaded_by, uploaded_at

## Backend Changes
- Install multer package
- Add POST /cases/:id/files endpoint for upload
- Add GET /cases/:id/files endpoint for listing files
- Add GET /files/:id/download endpoint for download

## Frontend Changes
- Add file upload component to case detail page (advocate view)
- Add file list component to case detail page (client view)
- Add download links for files
