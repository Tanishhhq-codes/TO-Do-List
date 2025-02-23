document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTask');
    const taskList = document.getElementById('taskList');
    const filterBtns = document.querySelectorAll('.filter-btn');

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let deletedTasks = [];

    // Enhanced Sound Effects
    const sounds = {
        complete: {
            url: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
            audio: null
        },
        delete: {
            url: 'https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3',
            audio: null
        },
        add: {
            url: 'https://assets.mixkit.co/active_storage/sfx/2330/2330-preview.mp3',
            audio: null
        },
        undo: {
            url: 'https://assets.mixkit.co/active_storage/sfx/2205/2205-preview.mp3',
            audio: null
        },
        redo: {
            url: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
            audio: null
        },
        hover: {
            url: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
            audio: null
        }
    };

    // Preload sounds
    function preloadSounds() {
        Object.keys(sounds).forEach(key => {
            sounds[key].audio = new Audio(sounds[key].url);
            // Enable sound only after user interaction
            sounds[key].audio.load();
        });
    }

    // Play sound with volume control
    function playSound(soundName, volume = 0.5) {
        try {
            if (sounds[soundName].audio) {
                sounds[soundName].audio.volume = volume;
                sounds[soundName].audio.currentTime = 0;
                sounds[soundName].audio.play()
                    .catch(err => console.log('Sound play prevented:', err));
            }
        } catch (err) {
            console.log('Error playing sound:', err);
        }
    }

    // Initialize sounds after first user interaction
    document.addEventListener('click', function initSounds() {
        preloadSounds();
        document.removeEventListener('click', initSounds);
    }, { once: true });

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Remove notification after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    function showConfetti() {
        const confetti = new JSConfetti();
        confetti.addConfetti({
            confettiColors: [
                '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
                '#FF00FF', '#00FFFF', '#FFA500', '#800080'
            ],
            confettiRadius: 6,
            confettiNumber: 150,
            emojis: ['🎉', '⭐', '✨'],
        });
    }

    function updateTaskStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        document.getElementById('totalTasks').textContent = tasks.length;
        document.getElementById('completedTasks').textContent = 
            tasks.filter(t => t.status === 'done').length;
        document.getElementById('pendingTasks').textContent = 
            tasks.filter(t => t.status !== 'done').length;
        
        // High priority tasks
        document.getElementById('highPriorityTasks').textContent = 
            tasks.filter(t => t.priority === 'high').length;

        // Completion rate
        const completionRate = tasks.length ? 
            Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0;
        document.getElementById('completionRate').textContent = `${completionRate}%`;

        // Tasks created today
        const tasksToday = tasks.filter(task => {
            const taskDate = new Date(task.createdAt);
            taskDate.setHours(0, 0, 0, 0);
            return taskDate.getTime() === today.getTime();
        }).length;
        document.getElementById('tasksToday').textContent = tasksToday;

        // Overdue tasks
        const overdueTasks = tasks.filter(task => {
            if (!task.dueDate || task.status === 'done') return false;
            return new Date(task.dueDate) < new Date();
        }).length;
        document.getElementById('overdueTasks').textContent = overdueTasks;
    }

    function createTaskElement(task) {
        const taskElement = document.createElement('div');
        taskElement.className = `task-item ${task.status} priority-${task.priority || 'medium'}`;
        taskElement.setAttribute('data-task-id', task.id);
        
        // Format date
        const date = new Date(task.createdAt);
        const formattedDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Format due date if exists
        let dueDateHtml = '';
        if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            const isOverdue = dueDate < new Date() && task.status !== 'done';
            const formattedDueDate = dueDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            dueDateHtml = `
                <div class="due-date ${isOverdue ? 'overdue' : ''}">
                    <i class="fas fa-clock"></i>
                    Due: ${formattedDueDate}
                </div>
            `;
        }

        taskElement.innerHTML = `
            <div class="task-content">
                <i class="fas ${task.status === 'done' ? 'fa-check-circle' : 'fa-circle'} status-icon"></i>
                <div class="task-info">
                    <div class="task-text">${task.text}</div>
                    <div class="task-meta">
                        <div class="created-date">
                            <i class="fas fa-calendar"></i>
                            Created: ${formattedDate}
                        </div>
                        ${dueDateHtml}
                    </div>
                </div>
            </div>
            <div class="task-priority">
                <select onchange="changePriority('${task.id}', this.value)">
                    <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
                    <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
                </select>
            </div>
            <div class="task-actions">
                <button class="status-btn" onclick="changeStatus('${task.id}')">
                    <i class="fas ${task.status === 'done' ? 'fa-undo' : 'fa-check'}"></i>
                </button>
                <button class="edit-btn" onclick="editTask('${task.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-btn" onclick="deleteTask('${task.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        // Add hover sound effect
        taskElement.addEventListener('mouseenter', () => playSound('hover', 0.1));
        
        return taskElement;
    }

    // Add task editing functionality
    window.editTask = (taskId) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            const newText = prompt('Edit task:', task.text);
            if (newText && newText.trim()) {
                task.text = newText.trim();
                task.lastEdited = new Date();
                saveTasks();
                renderTasks();
                showNotification('Task updated successfully');
                playSound('add');
            }
        }
    };

    // Enhanced status change
    window.changeStatus = (taskId) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.status = task.status === 'done' ? 'todo' : 'done';
            if (task.status === 'done') {
                playSound('complete');
                showConfetti();
                showNotification('Task completed! 🎉');
            } else {
                playSound('redo');
                showNotification('Task restored to todo');
            }
            saveTasks();
            renderTasks();
        }
    };

    // Enhanced delete with animation
    window.deleteTask = (taskId) => {
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            const taskElement = document.querySelector(`.task-item:has([onclick*="${taskId}"])`);
            taskElement.classList.add('deleting');
            
            setTimeout(() => {
                deletedTasks.push(tasks[taskIndex]);
                tasks.splice(taskIndex, 1);
                playSound('delete');
                saveTasks();
                renderTasks();
                updateTaskStats();
                showNotification('Task deleted', 'error');
            }, 300);
        }
    };

    // Enhanced undo with animation
    window.undoDelete = () => {
        if (deletedTasks.length > 0) {
            const taskToRestore = deletedTasks.pop();
            tasks.push(taskToRestore);
            playSound('undo');
            saveTasks();
            renderTasks();
            showNotification('Task restored successfully');
        }
    };

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            taskInput.focus();
        }
        if (e.ctrlKey && e.key === 'z' && deletedTasks.length > 0) {
            e.preventDefault();
            undoDelete();
        }
    });

    // Add task functionality
    addTaskBtn.addEventListener('click', () => {
        const text = taskInput.value.trim();
        const priority = document.getElementById('prioritySelect').value;
        const dueDate = document.getElementById('dueDateInput').value;
        
        if (text) {
            const newTask = {
                id: Date.now().toString(),
                text: text,
                status: 'todo',
                priority: priority,
                createdAt: new Date(),
                dueDate: dueDate ? new Date(dueDate) : null
            };
            
            tasks.push(newTask);
            playSound('add');
            showNotification('Task added successfully! 📝');
            saveTasks();
            renderTasks();
            updateTaskStats();
            taskInput.value = '';
            document.getElementById('dueDateInput').value = '';
        } else {
            showNotification('Please enter a task!', 'error');
        }
    });

    // Add task on Enter key
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTaskBtn.click();
        }
    });

    // Filter button functionality
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTasks(btn.dataset.filter);
            playSound('hover', 0.2);
        });
    });

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function renderTasks(filter = 'all') {
        taskList.innerHTML = '';
        let filteredTasks = [...tasks]; // Create a copy for sorting
        
        if (filter !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.status === filter);
        }

        // Sort by priority
        filteredTasks.sort((a, b) => {
            const priorityOrder = { high: 1, medium: 2, low: 3 };
            return priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium'];
        });

        filteredTasks.forEach(task => {
            taskList.appendChild(createTaskElement(task));
        });

        // Show undo button if there are deleted tasks
        const undoContainer = document.getElementById('undoContainer');
        if (deletedTasks.length > 0) {
            undoContainer.style.display = 'block';
        } else {
            undoContainer.style.display = 'none';
        }
    }

    // Add after your existing code but inside DOMContentLoaded
    const toggleNotesBtn = document.getElementById('toggleNotes');
    const notesModal = document.getElementById('notesModal');
    const closeModalBtn = document.querySelector('.close-modal-btn');
    const addNoteBtn = document.getElementById('addNoteBtn');
    const notesContainer = document.getElementById('notesContainer');

    let notes = JSON.parse(localStorage.getItem('notes')) || [];

    function saveNotes() {
        localStorage.setItem('notes', JSON.stringify(notes));
    }

    function createNoteElement(note) {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'note';
        
        const formattedDate = new Date(note.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        noteDiv.innerHTML = `
            <textarea class="note-content" placeholder="Write your note here...">${note.content}</textarea>
            <div class="note-footer">
                <span>${formattedDate}</span>
                <div class="note-actions">
                    <button class="delete-btn" onclick="deleteNote('${note.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

        const textarea = noteDiv.querySelector('.note-content');
        textarea.addEventListener('input', () => {
            note.content = textarea.value;
            saveNotes();
        });

        return noteDiv;
    }

    function renderNotes() {
        notesContainer.innerHTML = '';
        notes.forEach(note => {
            notesContainer.appendChild(createNoteElement(note));
        });
    }

    // Toggle notes modal
    toggleNotesBtn.addEventListener('click', () => {
        notesModal.classList.add('show');
        renderNotes();
        playSound('add', 0.1);
    });

    // Close modal
    closeModalBtn.addEventListener('click', () => {
        notesModal.classList.remove('show');
        playSound('delete', 0.1);
    });

    // Close modal when clicking outside
    notesModal.addEventListener('click', (e) => {
        if (e.target === notesModal) {
            notesModal.classList.remove('show');
            playSound('delete', 0.1);
        }
    });

    // Add new note
    addNoteBtn.addEventListener('click', () => {
        const newNote = {
            id: Date.now().toString(),
            content: '',
            createdAt: new Date()
        };
        notes.push(newNote);
        saveNotes();
        renderNotes();
        playSound('add');
        showNotification('New note added! 📝');
    });

    // Delete note
    window.deleteNote = (noteId) => {
        notes = notes.filter(n => n.id !== noteId);
        saveNotes();
        renderNotes();
        playSound('delete');
        showNotification('Note deleted');
    };

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && notesModal.classList.contains('show')) {
            notesModal.classList.remove('show');
            playSound('delete', 0.1);
        }
    });

    // Initial render
    renderTasks();
    updateTaskStats();
}); 