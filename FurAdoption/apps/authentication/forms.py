from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm
from apps.authentication.models import Profile  # Import your Profile model

class CustomRegisterForm(UserCreationForm):
    # Add the extra fields from your HTML
    email = forms.EmailField(required=True)
    first_name = forms.CharField(required=True)
    last_name = forms.CharField(required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name']


# --- Add this new form below your registration form ---
class ProfileEditForm(forms.ModelForm):
    class Meta:
        model = Profile
        fields = ['full_name', 'bio', 'profile_picture']
        widgets = {
            'full_name': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Full Name'}),
            'bio': forms.Textarea(attrs={'class': 'form-textarea', 'placeholder': 'Tell us about yourself or your shelter...', 'rows': 3}),
            'profile_picture': forms.FileInput(attrs={'class': 'form-file-input', 'accept': 'image/*'}),
        }