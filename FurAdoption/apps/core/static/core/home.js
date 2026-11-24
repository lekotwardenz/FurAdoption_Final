document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const modalOverlay = document.getElementById('createPostModal');
    const openModalTriggers = document.querySelectorAll('.post-input-wrapper, .post-submit-btn');
    const closeModalBtn = document.querySelector('.close-modal-btn');
    const dropdown = document.getElementById('postClassification');
    const textarea = document.getElementById('postTextarea');

    const imageUploadInput = document.getElementById('imageUploadInput');
    const triggerImageUpload = document.getElementById('triggerImageUpload');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');

    const triggerEmojiPicker = document.getElementById('triggerEmojiPicker');
    const emojiPickerMenu = document.getElementById('emojiPickerMenu');
    const emojiItems = document.querySelectorAll('.emoji-item');

    let selectedFiles = [];
    const MAX_IMAGES = 10;

    // --- FEED FILTER LOGIC ---
    const filterPills = document.querySelectorAll('.filter-pill');
    const filteredEmptyState = document.getElementById('filteredEmptyState');
    let activeFilter = 'all';

    function applyFeedFilter(filterValue) {
        activeFilter = filterValue;
        const postCards = document.querySelectorAll('.feed-container .post-card');
        let visibleCount = 0;

        postCards.forEach(card => {
            const postType = card.getAttribute('data-post-type');
            const matches = filterValue === 'all' || postType === filterValue;
            card.style.display = matches ? '' : 'none';
            if (matches) visibleCount++;
        });

        if (filteredEmptyState) {
            filteredEmptyState.style.display = (postCards.length > 0 && visibleCount === 0) ? 'block' : 'none';
        }
    }

    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            applyFeedFilter(pill.getAttribute('data-filter') || 'all');
        });
    });

    // --- PROFILE DROPDOWN POPOUT LOGIC ---
    const profileTrigger = document.getElementById('profileDropdownTrigger');
    const profileMenu = document.getElementById('profileDropdownMenu');

    if (profileTrigger && profileMenu) {
        profileTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            profileMenu.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!profileTrigger.contains(e.target)) {
                profileMenu.classList.remove('show');
            }
        });
    }

    // --- MODAL TOGGLE & DISCARD LOGIC ---
    if (modalOverlay) {
        openModalTriggers.forEach(trigger => {
            trigger.addEventListener('click', () => {
                modalOverlay.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            });
        });
    }

    const handleClose = () => {
        const confirmDiscard = confirm("Discard post?");
        if (confirmDiscard && modalOverlay) {
            modalOverlay.style.display = 'none';
            document.body.style.overflow = 'auto';
            if (textarea) textarea.value = '';

            selectedFiles = [];
            updateImagePreviews();
            if (emojiPickerMenu) emojiPickerMenu.style.display = 'none';
        }
    };

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', handleClose);
    }

    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                handleClose();
            }
        });
    }

    // --- DYNAMIC PLACEHOLDER LOGIC ---
    if (dropdown && textarea) {
        dropdown.addEventListener('change', (e) => {
            if (e.target.value === 'open' || e.target.value === 'Rescue') {
                textarea.placeholder = "Just rescued an animal? Post about it!";
            } else if (e.target.value === 'willing' || e.target.value === 'Looking to Adopt') {
                textarea.placeholder = "Looking for a new pet? Post about it";
            }
        });
        dropdown.dispatchEvent(new Event('change'));
    }

    // --- MULTIPLE IMAGE UPLOAD LOGIC ---
    if (triggerImageUpload && imageUploadInput) {
        triggerImageUpload.addEventListener('click', () => {
            imageUploadInput.click();
        });

        imageUploadInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);

            if (selectedFiles.length + files.length > MAX_IMAGES) {
                alert(`You can only upload a maximum of ${MAX_IMAGES} images.`);
                const availableSlots = MAX_IMAGES - selectedFiles.length;
                selectedFiles = selectedFiles.concat(files.slice(0, availableSlots));
            } else {
                selectedFiles = selectedFiles.concat(files);
            }

            updateImagePreviews();
            imageUploadInput.value = '';
        });
    }

    function updateImagePreviews() {
        if (!imagePreviewContainer) return;
        imagePreviewContainer.innerHTML = '';

        if (selectedFiles.length > 0) {
            imagePreviewContainer.style.display = 'grid';

            selectedFiles.forEach((file, index) => {
                const imageUrl = URL.createObjectURL(file);

                const wrapper = document.createElement('div');
                wrapper.classList.add('preview-wrapper');

                const img = document.createElement('img');
                img.src = imageUrl;

                const removeBtn = document.createElement('button');
                removeBtn.classList.add('remove-image-btn');
                removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';

                removeBtn.onclick = () => {
                    selectedFiles.splice(index, 1);
                    updateImagePreviews();
                };

                wrapper.appendChild(img);
                wrapper.appendChild(removeBtn);
                imagePreviewContainer.appendChild(wrapper);
            });
        } else {
            imagePreviewContainer.style.display = 'none';
        }
    }

    // --- EMOJI PICKER LOGIC ---
    if (triggerEmojiPicker && emojiPickerMenu) {
        triggerEmojiPicker.addEventListener('click', (e) => {
            e.stopPropagation();
            if (emojiPickerMenu.style.display === 'grid') {
                emojiPickerMenu.style.display = 'none';
            } else {
                emojiPickerMenu.style.display = 'grid';
            }
        });

        document.addEventListener('click', (e) => {
            if (!emojiPickerMenu.contains(e.target) && e.target !== triggerEmojiPicker) {
                emojiPickerMenu.style.display = 'none';
            }
        });
    }

    if (textarea) {
        emojiItems.forEach(emoji => {
            emoji.addEventListener('click', (e) => {
                const cursorPosition = textarea.selectionStart;
                const textBefore = textarea.value.substring(0, cursorPosition);
                const textAfter = textarea.value.substring(cursorPosition);

                textarea.value = textBefore + e.target.innerText + textAfter;
                textarea.selectionStart = textarea.selectionEnd = cursorPosition + 2;
                textarea.focus();
            });
        });
    }

    // --- DATABASE SUBMISSION LOGIC ---
    const postBtn = document.querySelector('.modal-post-btn');

    if (postBtn) {
        postBtn.addEventListener('click', () => {
            const formData = new FormData();
            formData.append('classification', dropdown ? dropdown.value : 'Rescue');
            formData.append('content', textarea ? textarea.value : '');

            selectedFiles.forEach((file) => {
                formData.append('images', file);
            });

            const csrfTokenElement = document.querySelector('[name=csrfmiddlewaretoken]');
            if (!csrfTokenElement) {
                alert("CSRF token missing from HTML. Please add {% csrf_token %} to your template.");
                return;
            }
            const csrfToken = csrfTokenElement.value;

            const originalText = postBtn.innerText;
            postBtn.innerText = "Posting...";
            postBtn.disabled = true;

            fetch('/create-post/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken
                },
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    if (modalOverlay) modalOverlay.style.display = 'none';
                    document.body.style.overflow = 'auto';
                    if (textarea) textarea.value = '';
                    selectedFiles = [];
                    updateImagePreviews();
                    if (emojiPickerMenu) emojiPickerMenu.style.display = 'none';
                    alert("Post successfully saved to DB!");
                    window.location.reload();
                } else {
                    alert("Error: " + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert("Something went wrong while posting.");
            })
            .finally(() => {
                postBtn.innerText = originalText;
                postBtn.disabled = false;
            });
        });
    }

    // --- DELETE POST LOGIC ---
    const deleteButtons = document.querySelectorAll('.delete-post-btn');

    deleteButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            const postId = this.getAttribute('data-post-id');
            if (!confirm('Are you sure you want to delete this post?')) return;

            const csrfTokenElement = document.querySelector('[name=csrfmiddlewaretoken]');
            if (!csrfTokenElement) {
                alert('CSRF token missing from HTML.');
                return;
            }

            const postCard = this.closest('.post-card');
            this.disabled = true;

            fetch(`/delete-post/${postId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfTokenElement.value,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    if (postCard) {
                        postCard.remove();
                    }
                    const feedContainer = document.querySelector('.feed-container');
                    if (feedContainer && feedContainer.querySelectorAll('.post-card').length === 0) {
                        feedContainer.innerHTML = '<div class="empty-feed"><p style="text-align: center; color: #888; margin-top: 40px;">No posts yet. Be the first to post!</p></div>';
                    } else {
                        applyFeedFilter(activeFilter);
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

    // --- LIKES LOGIC ---
    const likeButtons = document.querySelectorAll('.like-btn');

    likeButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            const postActionsDiv = this.closest('.post-actions');
            const postId = postActionsDiv.getAttribute('data-post-id');
            const icon = this.querySelector('i');
            const countSpan = this.querySelector('.like-count');

            const csrfTokenElement = document.querySelector('[name=csrfmiddlewaretoken]');
            if (!csrfTokenElement) return;

            fetch(`/toggle-like/${postId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfTokenElement.value,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
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

    // --- COMMENTS LOGIC ---
    const commentButtons = document.querySelectorAll('.submit-comment-btn');

    commentButtons.forEach(btn => {
        if (btn.dataset.commentBound === 'true') return;
        btn.dataset.commentBound = 'true';

        btn.addEventListener('click', function () {
            if (this.disabled) return;

            const postId = this.getAttribute('data-post-id');
            const inputField = document.getElementById(`comment-input-${postId}`);
            const commentText = inputField ? inputField.value.trim() : '';

            if (!commentText) return;

            const csrfTokenElement = document.querySelector('[name=csrfmiddlewaretoken]');
            if (!csrfTokenElement) return;

            this.disabled = true;
            if (inputField) inputField.value = '';

            fetch(`/add-comment/${postId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfTokenElement.value,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ comment_text: commentText })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const postActions = document.querySelector(`.post-actions[data-post-id="${postId}"]`);
                    if (postActions) {
                        const countSpan = postActions.querySelector('.comment-count');
                        if (countSpan) countSpan.innerText = data.comment_count;
                    }

                    const commentList = document.getElementById(`comment-list-${postId}`);
                    if (commentList) {
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
                    }
                } else {
                    if (inputField && !inputField.value) inputField.value = commentText;
                    alert(data.message);
                }
            })
            .catch(err => {
                console.error('Error:', err);
                if (inputField && !inputField.value) inputField.value = commentText;
            })
            .finally(() => {
                this.disabled = false;
            });
        });
    });

    // --- TOGGLE COMMENTS LOGIC ---
    const toggleButtons = document.querySelectorAll('.toggle-comments-btn');

    toggleButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            const postId = this.getAttribute('data-post-id');
            const commentsSection = document.getElementById(`comments-section-${postId}`);
            if (!commentsSection) return;

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