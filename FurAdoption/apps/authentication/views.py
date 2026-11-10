from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django.contrib.auth.forms import AuthenticationForm
from django.contrib import messages
from .forms import CustomRegisterForm
from apps.authentication.forms import ProfileEditForm

def register(request):
    if request.method == 'POST':
        form = CustomRegisterForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'Account created successfully! Please log in.')
            return redirect('login')
        else:
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, error)
    else:
        form = CustomRegisterForm()
        
    return render(request, 'authentication/register/register.html', {'form': form})

def login_view(request):
    # If the user is already logged in, send them straight to the app
    if request.user.is_authenticated:
        return redirect('home') 

    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            
            # Verify credentials against the database (uses your EmailBackend)
            user = authenticate(username=username, password=password)
            
            if user is not None:
                login(request, user)
                return redirect('home') 
            else:
                messages.error(request, "Invalid email or password.")
        else:
            messages.error(request, "Invalid email or password.")
    else:
        form = AuthenticationForm()

    return render(request, 'authentication/login/login.html', {'form': form})