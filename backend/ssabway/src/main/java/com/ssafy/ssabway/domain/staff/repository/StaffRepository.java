package com.ssafy.ssabway.domain.staff.repository;

import com.ssafy.ssabway.domain.staff.entity.Staff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface StaffRepository extends JpaRepository<Staff, Long> {

    Optional<Staff> findByStaffCode(String staffCode);

    // 출발역을 담당하는 역무원을 조회
    Optional<Staff> findByStationId(Long stationId);

    @Query(
            value = """
        SELECT s.*
        FROM staffs s
        JOIN stations st
          ON st.station_id = s.station_id
        WHERE st.name_ko = :departure
        """,
            nativeQuery = true)
    Optional<Staff> findByDepartureStationName(
            @Param("departure") String departure
    );
}
