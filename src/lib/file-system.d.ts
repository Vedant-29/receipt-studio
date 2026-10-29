// The parts of the File System Access API (Chrome, Edge) that TypeScript's DOM types leave out

interface FileSystemHandlePermissionDescriptor {
	mode?: 'read' | 'readwrite';
}

interface FileSystemHandle {
	queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
	requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}

interface Window {
	showDirectoryPicker?(options?: {
		id?: string;
		mode?: 'read' | 'readwrite';
		startIn?: 'desktop' | 'documents' | 'downloads';
	}): Promise<FileSystemDirectoryHandle>;
}
