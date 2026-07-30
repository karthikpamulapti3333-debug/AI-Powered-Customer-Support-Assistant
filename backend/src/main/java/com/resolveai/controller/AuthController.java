package com.resolveai.controller;

import com.resolveai.dto.*;
import com.resolveai.exception.BadRequestException;
import com.resolveai.exception.ResourceNotFoundException;
import com.resolveai.model.*;
import com.resolveai.repository.*;
import com.resolveai.security.JwtUtils;
import com.resolveai.security.UserDetailsImpl;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private AgentRepository agentRepository;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<String> roles = userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .collect(Collectors.toList());

        return ResponseEntity.ok(new JwtResponse(jwt,
                userDetails.getId(),
                userDetails.getUsername(),
                userDetails.getEmail(),
                roles));
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest signUpRequest) {
        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            throw new BadRequestException("Error: Username is already taken!");
        }

        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            throw new BadRequestException("Error: Email is already in use!");
        }

        // Create new user's account
        User user = User.builder()
                .username(signUpRequest.getUsername())
                .email(signUpRequest.getEmail())
                .password(encoder.encode(signUpRequest.getPassword()))
                .firstName(signUpRequest.getFirstName())
                .lastName(signUpRequest.getLastName())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        String strRole = signUpRequest.getRole();
        Set<Role> roles = new HashSet<>();

        if (strRole == null || strRole.trim().isEmpty()) {
            Role userRole = roleRepository.findByName("ROLE_CUSTOMER")
                    .orElseThrow(() -> new ResourceNotFoundException("Error: Role 'ROLE_CUSTOMER' is not found."));
            roles.add(userRole);
        } else {
            String roleNameInput = strRole.toUpperCase();
            final String finalRoleName = roleNameInput.startsWith("ROLE_") ? roleNameInput : "ROLE_" + roleNameInput;
            Role reqRole = roleRepository.findByName(finalRoleName)
                    .orElseThrow(() -> new ResourceNotFoundException("Error: Role '" + finalRoleName + "' is not found."));
            roles.add(reqRole);
        }

        user.setRoles(roles);

        // If registering an AGENT, optionally assign a department
        if (strRole != null && strRole.equalsIgnoreCase("AGENT")) {
            if (signUpRequest.getDepartmentId() != null) {
                Department dept = departmentRepository.findById(signUpRequest.getDepartmentId())
                        .orElseThrow(() -> new ResourceNotFoundException("Error: Department not found."));
                user.setDepartment(dept);
            }
        }

        User savedUser = userRepository.save(user);

        // If role is AGENT, register in agents table
        boolean isAgent = roles.stream().anyMatch(r -> r.getName().equals("ROLE_AGENT"));
        if (isAgent) {
            Agent agent = Agent.builder()
                    .user(savedUser)
                    .department(savedUser.getDepartment())
                    .status("AVAILABLE")
                    .maxConcurrentComplaints(5)
                    .currentComplaintsCount(0)
                    .build();
            agentRepository.save(agent);
        }

        return ResponseEntity.ok(new MessageResponse(true, "User registered successfully!"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication.getPrincipal().equals("anonymousUser")) {
            throw new BadRequestException("Not authenticated");
        }
        
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return ResponseEntity.ok(user);
    }

    @PutMapping("/profile/update")
    public ResponseEntity<?> updateProfile(@Valid @RequestBody ProfileUpdateRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication.getPrincipal().equals("anonymousUser")) {
            throw new BadRequestException("Not authenticated");
        }
        
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        if (!user.getEmail().equalsIgnoreCase(request.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Error: Email is already in use!");
        }

        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setUpdatedAt(LocalDateTime.now());

        User updatedUser = userRepository.save(user);
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication.getPrincipal().equals("anonymousUser")) {
            throw new BadRequestException("Not authenticated");
        }
        
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!encoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Error: Current password does not match!");
        }

        user.setPassword(encoder.encode(request.getNewPassword()));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        return ResponseEntity.ok(new MessageResponse(true, "Password changed successfully!"));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);
        if (user != null) {
            String token = java.util.UUID.randomUUID().toString();
            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .token(token)
                    .user(user)
                    .expiryDate(LocalDateTime.now().plusMinutes(15))
                    .used(false)
                    .build();
            passwordResetTokenRepository.save(resetToken);

            String resetLink = frontendUrl + "/reset-password?token=" + token;
            System.out.println("====================================================================");
            System.out.println("PASSWORD RESET REQUESTED FOR: " + user.getEmail());
            System.out.println("RESET LINK: " + resetLink);
            System.out.println("====================================================================");
        }

        return ResponseEntity.ok(new MessageResponse(true, "If the email is registered in our system, you will receive a password reset link shortly."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(request.getToken())
                .orElseThrow(() -> new BadRequestException("Error: Invalid password reset token!"));

        if (resetToken.isUsed()) {
            throw new BadRequestException("Error: Token has already been used!");
        }

        if (resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Error: Token has expired!");
        }

        User user = resetToken.getUser();
        user.setPassword(encoder.encode(request.getNewPassword()));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);

        return ResponseEntity.ok(new MessageResponse(true, "Password reset successfully!"));
    }
}
