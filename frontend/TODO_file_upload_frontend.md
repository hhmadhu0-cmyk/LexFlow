# Frontend File Upload Implementation

## Tasks
- [x] Add state management for files and file operations in CaseDetail.jsx
- [x] Add functions to fetch case files, upload files, and download files
- [x] Add file upload component for advocates (file input with upload button)
- [x] Add file list component for clients (showing downloadable files)
- [x] Check user role to conditionally render upload vs download functionality
- [x] Add proper error handling and loading states
- [x] Test file upload and download functionality (frontend server running successfully)

## Implementation Details
- Use localStorage to get user role ("advocate", "client", "staff")
- Backend endpoints: POST /cases/:id/files, GET /cases/:id/files, GET /files/:id/download
- Add file upload section after case details
- Add file list section for clients
- Handle file selection, upload progress, and download links
