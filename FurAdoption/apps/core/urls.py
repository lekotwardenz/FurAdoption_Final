from django.urls import path
from . import views

urlpatterns = [
    path('', views.home_view, name='home'),
    path('create-post/', views.create_post, name='create_post'),
    path('delete-post/<int:post_id>/', views.delete_post, name='delete_post'),

    # New interactive endpoints for likes and comments
    path('toggle-like/<int:post_id>/', views.toggle_like, name='toggle_like'),
    path('add-comment/<int:post_id>/', views.add_comment, name='add_comment'),

    # Put 'profile/edit/' BEFORE 'profile/<str:username>/'
    path('profile/edit/', views.edit_profile_view, name='edit_profile'),
    path('profile/<str:username>/', views.profile_view, name='profile'),

    path('inventory/create/', views.create_inventory, name='create_inventory'),
    path('inventory/add-animal/', views.add_animal, name='add_animal'),
    path('inventory/toggle-status/<int:animal_id>/', views.toggle_animal_status, name='toggle_animal_status'),

    path('notifications/', views.get_notifications, name='get_notifications'),
path('notifications/read/', views.mark_notifications_read, name='mark_notifications_read'),
]