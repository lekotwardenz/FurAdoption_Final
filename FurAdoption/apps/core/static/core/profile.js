document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const csrfTokenInput = document.querySelector('[name=csrfmiddlewaretoken]');
    const csrfToken = csrfTokenInput ? csrfTokenInput.value : '';

    function activateTab(targetId) {
        tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === targetId);
        });
        tabPanes.forEach(pane => {
            pane.style.display = pane.id === targetId ? 'block' : 'none';
        });
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-tab');
            activateTab(targetId);
        });
    });

    // Support ?tab=inventory from dropdown link
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tab') === 'inventory') {
        activateTab('user-inventory');
    }

    // --- CREATE INVENTORY ---
    const createInventoryBtn = document.getElementById('createInventoryBtn');
    if (createInventoryBtn) {
        createInventoryBtn.addEventListener('click', () => {
            const shelterNameInput = document.getElementById('newShelterNameInput');
            const shelterName = shelterNameInput ? shelterNameInput.value.trim() : '';

            createInventoryBtn.disabled = true;
            createInventoryBtn.innerText = 'Creating...';

            fetch('/inventory/create/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ shelter_name: shelterName })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    window.location.href = `${window.location.pathname}?tab=inventory`;
                } else {
                    alert(data.message || 'Could not create inventory.');
                    createInventoryBtn.disabled = false;
                    createInventoryBtn.innerText = 'Create Inventory';
                }
            })
            .catch(() => {
                alert('Something went wrong while creating inventory.');
                createInventoryBtn.disabled = false;
                createInventoryBtn.innerText = 'Create Inventory';
            });
        });
    }

    // --- ADD ANIMAL MODAL ---
    const addAnimalModal = document.getElementById('addAnimalModal');
    const openAddAnimalModalBtn = document.getElementById('openAddAnimalModalBtn');
    const closeAddAnimalModalBtn = document.getElementById('closeAddAnimalModalBtn');
    const submitAddAnimalBtn = document.getElementById('submitAddAnimalBtn');

    if (openAddAnimalModalBtn && addAnimalModal) {
        openAddAnimalModalBtn.addEventListener('click', () => {
            addAnimalModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        });
    }

    if (closeAddAnimalModalBtn && addAnimalModal) {
        closeAddAnimalModalBtn.addEventListener('click', () => {
            addAnimalModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });
    }

    if (submitAddAnimalBtn) {
        submitAddAnimalBtn.addEventListener('click', () => {
            const nameVal = document.getElementById('animalNameInput').value.trim();
            const speciesVal = document.getElementById('animalSpeciesInput').value.trim();
            const breedVal = document.getElementById('animalBreedInput').value.trim();
            const ageVal = document.getElementById('animalAgeInput').value.trim();
            const statusVal = document.getElementById('animalStatusInput').value;

            if (!speciesVal) {
                alert('Please enter the animal species.');
                return;
            }

            submitAddAnimalBtn.disabled = true;
            submitAddAnimalBtn.innerText = 'Saving...';

            fetch('/inventory/add-animal/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: nameVal,
                    species: speciesVal,
                    breed: breedVal,
                    age: ageVal,
                    adoption_status: statusVal
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    window.location.href = `${window.location.pathname}?tab=inventory`;
                } else {
                    alert(data.message || 'Could not add animal.');
                }
            })
            .catch(() => alert('Something went wrong while adding animal.'))
            .finally(() => {
                submitAddAnimalBtn.disabled = false;
                submitAddAnimalBtn.innerText = 'Save Animal';
            });
        });
    }

    // --- TOGGLE ANIMAL ADOPTION STATUS ---
    document.querySelectorAll('.toggle-status-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const animalId = this.getAttribute('data-animal-id');
            fetch(`/inventory/toggle-status/${animalId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/json'
                }
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const badge = document.getElementById(`status-badge-${animalId}`);
                    if (badge) {
                        badge.innerText = data.adoption_status;
                        badge.classList.toggle('badge-rescue', data.adoption_status === 'Available');
                        badge.classList.toggle('badge-adopt', data.adoption_status !== 'Available');
                    }
                }
            });
        });
    });

    // --- DELETE POST ON PROFILE ---
    document.querySelectorAll('.delete-post-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const postId = this.getAttribute('data-post-id');
            if (!confirm('Are you sure you want to delete this post?')) return;

            const postCard = this.closest('.post-card');
            this.disabled = true;

            fetch(`/delete-post/${postId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    if (postCard) {
                        postCard.remove();
                    }
                    const feedContainer = document.querySelector('#user-posts .feed-container');
                    if (feedContainer && feedContainer.querySelectorAll('.post-card').length === 0) {
                        feedContainer.innerHTML = '<div class="post-card"><p class="empty-state-text" style="text-align: center; color: #888;">No posts yet.</p></div>';
                    }
                } else {
                    alert('Error: ' + (data.message || 'Could not delete post.'));
                    this.disabled = false;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Something went wrong while deleting the post.');
                this.disabled = false;
            });
        });
    });

    // --- LIKES ON PROFILE POSTS ---
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const postActionsDiv = this.closest('.post-actions');
            const postId = postActionsDiv.getAttribute('data-post-id');
            const icon = this.querySelector('i');
            const countSpan = this.querySelector('.like-count');

            fetch(`/toggle-like/${postId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/json'
                }
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    countSpan.innerText = data.like_count;
                    if (data.liked) {
                        icon.classList.remove('fa-regular');
                        icon.classList.add('fa-solid', 'liked-heart');
                    } else {
                        icon.classList.remove('fa-solid', 'liked-heart');
                        icon.classList.add('fa-regular');
                    }
                }
            });
        });
    });

    // --- COMMENTS ON PROFILE POSTS ---
    document.querySelectorAll('.submit-comment-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const postId = this.getAttribute('data-post-id');
            const inputField = document.getElementById(`comment-input-${postId}`);
            const commentText = inputField.value.trim();
            if (!commentText) return;

            fetch(`/add-comment/${postId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ comment_text: commentText })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    inputField.value = '';
                    const postActions = document.querySelector(`.post-actions[data-post-id="${postId}"]`);
                    if (postActions) {
                        postActions.querySelector('.comment-count').innerText = data.comment_count;
                    }
                    const commentList = document.getElementById(`comment-list-${postId}`);
                    const newCommentHtml = `
                        <div class="comment-item">
                            <img src="${data.avatar_url}" alt="Profile" class="comment-profile-img">
                            <div class="comment-content">
                                <div class="comment-header">
                                    <span class="comment-author">${data.username}</span>
                                    <span class="comment-date">${data.date}</span>
                                </div>
                                <p class="comment-text">${data.text}</p>
                            </div>
                        </div>
                    `;
                    commentList.insertAdjacentHTML('beforeend', newCommentHtml);
                } else {
                    alert(data.message);
                }
            });
        });
    });

    // --- TOGGLE COMMENTS ---
    document.querySelectorAll('.toggle-comments-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const postId = this.getAttribute('data-post-id');
            const commentsSection = document.getElementById(`comments-section-${postId}`);
            if (commentsSection.style.display === 'none' || commentsSection.style.display === '') {
                commentsSection.style.display = 'block';
                this.innerText = 'Close comments';
            } else {
                commentsSection.style.display = 'none';
                this.innerText = 'Open comments';
            }
        });
    });

    // --- NOTIFICATIONS LOGIC ---
    const notifTrigger = document.getElementById('notifDropdownTrigger');
    const notifMenu = document.getElementById('notifDropdownMenu');
    const notifBadge = document.getElementById('notifBadge');
    const notifList = document.getElementById('notifList');
    const markAllReadBtn = document.getElementById('markAllReadBtn');

    function renderBadge(count) {
        if (!notifBadge) return;
        if (count > 0) {
            notifBadge.innerText = count > 99 ? '99+' : count;
            notifBadge.style.display = 'inline-flex';
        } else {
            notifBadge.style.display = 'none';
        }
    }

    function loadNotifications() {
        if (!notifList) return;
        fetch('/notifications/')
            .then(res => res.json())
            .then(data => {
                if (!data.success) return;
                renderBadge(data.unread_count);

                if (!data.notifications || data.notifications.length === 0) {
                    notifList.innerHTML = '<p class="notif-empty">No notifications yet.</p>';
                    return;
                }

                notifList.innerHTML = data.notifications.map(n => `
                    <div class="notif-item ${n.is_read ? '' : 'unread'}">
                        <img src="${n.avatar_url}" alt="Avatar" class="notif-avatar">
                        <div class="notif-text">
                            <span>${n.message}</span>
                            <span class="notif-date">${n.date}</span>
                        </div>
                    </div>
                `).join('');
            })
            .catch(err => console.error('Notification load error:', err));
    }

    if (notifTrigger && notifMenu) {
        loadNotifications();

        notifTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = notifMenu.classList.toggle('show');
            if (isOpen) {
                loadNotifications();
            }
        });

        document.addEventListener('click', (e) => {
            if (!notifTrigger.contains(e.target)) {
                notifMenu.classList.remove('show');
            }
        });
    }

    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const csrfEl = document.querySelector('[name=csrfmiddlewaretoken]');
            const token = csrfEl ? csrfEl.value : '';

            fetch('/notifications/read/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': token,
                    'Content-Type': 'application/json'
                }
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    renderBadge(0);
                    document.querySelectorAll('.notif-item.unread').forEach(el => {
                        el.classList.remove('unread');
                    });
                }
            });
        });
    }
});