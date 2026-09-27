package mohammad.development.praxis.modules.admin;

import mohammad.development.praxis.repos.AdminRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminSeederTest {

    @Mock
    private AdminRepository adminRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private AdminSeeder adminSeeder;

    @BeforeEach
    void setUp() {
        adminSeeder = new AdminSeeder(adminRepository, passwordEncoder);
    }

    @Test
    void run_noExistingAdmins_createsAdmin() throws Exception {
        when(adminRepository.existsByUsername("admin")).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("encoded-password");

        adminSeeder.run();

        ArgumentCaptor<Admin> adminCaptor = ArgumentCaptor.forClass(Admin.class);
        verify(adminRepository).insert(adminCaptor.capture());

        Admin savedAdmin = adminCaptor.getValue();
        assertEquals("admin", savedAdmin.getUsername());
        assertEquals("encoded-password", savedAdmin.getPasswordHash());
        assertTrue(savedAdmin.getRoles().contains("ADMIN"));
        assertTrue(savedAdmin.isEnabled());
    }

    @Test
    void run_existingAdmin_doesNotCreateOrChangeAdmin() throws Exception {
        when(adminRepository.existsByUsername("admin")).thenReturn(true);

        adminSeeder.run();

        verify(adminRepository, never()).insert(any(Admin.class));
        verifyNoInteractions(passwordEncoder);
    }

    @Test
    void run_otherAdminsExist_createsDefaultAdmin() throws Exception {
        when(adminRepository.existsByUsername("admin")).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("encoded-password");

        adminSeeder.run();

        verify(adminRepository).insert(any(Admin.class));
    }

    @Test
    void run_concurrentReplicaInsertedAdmin_doesNotFail() throws Exception {
        when(adminRepository.existsByUsername("admin")).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("encoded-password");
        when(adminRepository.insert(any(Admin.class)))
                .thenThrow(new DuplicateKeyException("username already exists"));

        assertDoesNotThrow(() -> adminSeeder.run());
    }

    @Test
    void run_withArgs_ignoresArgs() throws Exception {
        when(adminRepository.existsByUsername("admin")).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("encoded-password");

        adminSeeder.run("arg1", "arg2", "arg3");

        verify(adminRepository).insert(any(Admin.class));
    }
}
