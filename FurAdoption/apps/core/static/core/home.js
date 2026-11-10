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

    let selectedFiles = []; // Array to store multiple images
    const MAX_IMAGES = 10;

    // --- MODAL TOGGLE & DISCARD LOGIC ---
    openModalTriggers.forEach(trigger => {
        trigger.addEventListener('click', () => {
            modalOverlay.style.display = 'flex';
            document.body.style.overflow = 'hidden'; 
        });
    });

    const handleClose = () => {
        const confirmDiscard = confirm("Discard post?");
        if (confirmDiscard) {
            modalOverlay.style.display = 'none';
            document.body.style.overflow = 'auto'; 
            textarea.value = ''; 
            
            // Clear images on discard
            selectedFiles = [];
            updateImagePreviews();
            emojiPickerMenu.style.display = 'none';
        }
    };

    closeModalBtn.addEventListener('click', handleClose);

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            handleClose();
        }
    });

    // --- DYNAMIC PLACEHOLDER LOGIC ---
    dropdown.addEventListener('change', (e) => {
        if (e.target.value === 'open') {
            textarea.placeholder = "Just rescued an animal? Post about it!";
        } else if (e.target.value === 'willing') {
            textarea.placeholder = "Looking for a new pet? Post about it";
        }
    });
    dropdown.dispatchEvent(new Event('change'));

    // --- MULTIPLE IMAGE UPLOAD LOGIC ---
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

    function updateImagePreviews() {
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

    // --- DATABASE SUBMISSION LOGIC ---
    const postBtn = document.querySelector('.modal-post-btn');
    
    postBtn.addEventListener('click', () => {
        const formData = new FormData();
        formData.append('classification', dropdown.value);
        formData.append('content', textarea.value);
        
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
                modalOverlay.style.display = 'none';
                document.body.style.overflow = 'auto';
                textarea.value = '';
                selectedFiles = [];
                updateImagePreviews();
                emojiPickerMenu.style.display = 'none';
                alert("Post successfully saved to DB!");
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

    // --- LIKES LOGIC ---
    const likeButtons = document.querySelectorAll('.like-btn');
    
    likeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const postActionsDiv = this.closest('.post-actions');
            const postId = postActionsDiv.getAttribute('data-post-id');
            const icon = this.querySelector('i');
            const countSpan = this.querySelector('.like-count');
            
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

            fetch(`/toggle-like/${postId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update count
                    countSpan.innerText = data.like_count;
                    // Toggle heart appearance
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
        btn.addEventListener('click', function() {
            const postId = this.getAttribute('data-post-id');
            const inputField = document.getElementById(`comment-input-${postId}`);
            const commentText = inputField.value.trim();
            
            if (commentText === "") return; // Don't submit empty comments

            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

            fetch(`/add-comment/${postId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ comment_text: commentText })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Clear the input
                    inputField.value = "";
                    
                    // Update the comment count number
                    const postActions = document.querySelector(`.post-actions[data-post-id="${postId}"]`);
                    const countSpan = postActions.querySelector('.comment-count');
                    countSpan.innerText = data.comment_count;

                    // Build the new comment HTML and append it to the list
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

    // --- TOGGLE COMMENTS LOGIC ---
    const toggleButtons = document.querySelectorAll('.toggle-comments-btn');
    
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', function() {
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
});